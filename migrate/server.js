import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { createRequire } from "module";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Client, Databases, Query, ID } from "node-appwrite";
const require = createRequire(import.meta.url);
const process = require("process");

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: ".env.dev" });
} else {
  dotenv.config();
}

const env = process.env;

// Constants
const DISCORD_API = "https://discord.com/api/v10";
const MAX_NOTES_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache for member data
let memberCache = {
  data: null,
  timestamp: null,
  uniqueValues: null,
};

// JWT configuration
const JWT_SECRET = env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET is not set in environment variables");
  process.exit(1);
}

// Cookie configuration
const getCookieConfig = (maxAge = 24 * 60 * 60 * 1000) => {
  const config = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge,
    path: "/",
  };

  // Only add domain in production and if COOKIE_DOMAIN is set
  if (env.NODE_ENV === "production" && env.COOKIE_DOMAIN) {
    config.domain = env.COOKIE_DOMAIN;
    console.log("[Cookie Config] Using domain:", env.COOKIE_DOMAIN);
  }

  console.log("[Cookie Config]", config);
  return config;
};

// Role configuration
const WEAPON_LEAD_ROLES = {
  "1323121646336479253": { primary: "SNS", secondary: "GS" },
  "1323121710861516901": { primary: "SNS", secondary: "Wand" },
  "1323121684147994756": { primary: "SNS", secondary: "Dagger" },
  "1324201709886509107": { primary: "SNS", secondary: "Spear" },
  "1323122250995597442": { primary: "Wand", secondary: "Bow" },
  "1323122341995348078": { primary: "Wand", secondary: "Staff" },
  "1323122486396715101": { primary: "Wand", secondary: "SNS" },
  "1323122572174299160": { primary: "Wand", secondary: "Dagger" },
  "1323122828802920479": { primary: "Staff", secondary: "Bow" },
  "1323122917466181672": { primary: "Staff", secondary: "Dagger" },
  "1323122947040219166": { primary: "Bow", secondary: "Dagger" },
  "1323123053793640560": { primary: "GS", secondary: "Dagger" },
  "1323123139500048384": { primary: "Spear", secondary: "Dagger" },
  "1324201778190880799": { primary: "Spear", secondary: "Other" },
  "1323123176405729393": { primary: "Dagger", secondary: "Wand" },
  "1323123243959451671": { primary: "Xbow", secondary: "Dagger" },
};

const MASTER_ROLES = ["1309271313398894643", "1309284427553312769"];

// Memoized role checking utilities
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

const hasWeaponLeadPermission = memoize((userRoles, primary, secondary) => {
  if (!userRoles) return false;
  return Object.entries(WEAPON_LEAD_ROLES).some(([roleId, weapons]) => {
    return (
      userRoles.includes(roleId) &&
      weapons.primary === primary &&
      weapons.secondary === secondary
    );
  });
});

const hasMasterRole = memoize((userRoles) => {
  if (!userRoles) return false;
  return MASTER_ROLES.some((roleId) => userRoles.includes(roleId));
});

const hasAnyRequiredRole = memoize((roles) => {
  if (!roles) return false;
  return (
    roles.some((role) => Object.keys(WEAPON_LEAD_ROLES).includes(role)) ||
    roles.some((role) => MASTER_ROLES.includes(role))
  );
});

// Initialize Appwrite
const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT)
  .setProject(env.APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Function to fetch and cache member data
const fetchAndCacheMemberData = async () => {
  const now = Date.now();

  // Return cached data if it's still valid
  if (
    memberCache.data &&
    memberCache.timestamp &&
    now - memberCache.timestamp < CACHE_TTL
  ) {
    console.log(
      "[Cache HIT] Using cached member data, age:",
      Math.round((now - memberCache.timestamp) / 1000),
      "seconds"
    );
    return {
      members: memberCache.data,
      uniqueValues: memberCache.uniqueValues,
    };
  }

  console.log("[Cache MISS] Fetching fresh member data");
  try {
    // First get total count
    const countResponse = await databases.listDocuments(
      env.APPWRITE_DATABASE_ID,
      env.APPWRITE_COLLECTION_ID,
      [Query.isNotNull("guild")]
    );
    const total = countResponse.total;
    console.log(`[Appwrite] Found ${total} total members to fetch`);

    // Fetch all documents in batches
    const batchSize = 100;
    const batches = Math.ceil(total / batchSize);
    const allMembers = [];

    for (let i = 0; i < batches; i++) {
      console.log(
        `[Appwrite] Fetching batch ${
          i + 1
        }/${batches} (${batchSize} members per batch)`
      );
      const response = await databases.listDocuments(
        env.APPWRITE_DATABASE_ID,
        env.APPWRITE_COLLECTION_ID,
        [
          Query.isNotNull("guild"),
          Query.limit(batchSize),
          Query.offset(i * batchSize),
          Query.orderAsc("guild"),
          Query.orderAsc("ingame_name"),
        ]
      );
      allMembers.push(...response.documents);
    }

    // Calculate unique values
    const uniqueValues = allMembers.reduce(
      (acc, doc) => {
        if (doc.guild?.trim()) acc.guilds.add(doc.guild.trim());
        if (doc.primary_weapon?.trim())
          acc.primaryWeapons.add(doc.primary_weapon.trim());
        if (doc.secondary_weapon?.trim())
          acc.secondaryWeapons.add(doc.secondary_weapon.trim());
        return acc;
      },
      {
        guilds: new Set(),
        primaryWeapons: new Set(),
        secondaryWeapons: new Set(),
      }
    );

    // Convert sets to sorted arrays
    const sortedUniqueValues = {
      guilds: Array.from(uniqueValues.guilds).sort(),
      primaryWeapons: Array.from(uniqueValues.primaryWeapons).sort(),
      secondaryWeapons: Array.from(uniqueValues.secondaryWeapons).sort(),
    };

    console.log("[Cache UPDATE] Storing new member data in cache");
    // Update cache
    memberCache = {
      data: allMembers,
      timestamp: now,
      uniqueValues: sortedUniqueValues,
    };

    return {
      members: allMembers,
      uniqueValues: sortedUniqueValues,
    };
  } catch (error) {
    console.error("[ERROR] Error fetching member data:", error);
    throw error;
  }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
  next(err);
};

// Request validation middleware
const validateVodUpdate = async (req, res, next) => {
  const { discordId, notes } = req.body;

  if (!discordId) {
    return res.status(400).json({ error: "Discord ID is required" });
  }

  if (notes && (typeof notes !== "string" || notes.length > MAX_NOTES_LENGTH)) {
    return res.status(400).json({ error: "Invalid notes format or length" });
  }

  // Check if the user has a thread before allowing updates
  try {
    const memberData = await fetchAndCacheMemberData();
    const member = memberData.members.find((m) => m.discord_id === discordId);

    if (!member) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!member.has_thread) {
      return res
        .status(400)
        .json({ error: "User must have a ticket thread before updating" });
    }
  } catch (error) {
    console.error("Error checking thread status:", error);
    return res.status(500).json({ error: "Failed to validate thread status" });
  }

  next();
};

const app = express();

// Trust proxy configuration
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://static.cloudflareinsights.com",
        ],
        connectSrc: [
          "'self'",
          "https://vods.wohee.dev",
          "https://discord.com",
          "https://cloud.appwrite.io",
        ],
        imgSrc: ["'self'", "https:", "data:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
});
app.use(limiter);

// CORS configuration based on environment
const corsOptions = {
  origin:
    env.NODE_ENV === "production"
      ? "https://vods.wohee.dev" // In production, only allow nginx proxy domain
      : ["http://localhost:5173", "http://127.0.0.1:5173"], // In dev, allow Vite dev server
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};
app.use(cors(corsOptions));

// Serve static files in production
if (env.NODE_ENV === "production") {
  app.use(express.static("dist"));
}

app.use(cookieParser());
app.use(express.json());

// Add a function to clear invalid sessions
const clearInvalidSession = (res) => {
  res.clearCookie("session", getCookieConfig(env));
};

// Exchange Discord code for token and user data
app.post("/auth/discord/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.log("[Auth] No code provided in callback");
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    const redirectUri =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173/callback"
        : `${env.CLIENT_URL}/callback`;
    console.log("[Auth] Using redirect URI:", redirectUri);

    // Exchange code for token
    console.log("[Auth] Exchanging code for token");
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("[Auth ERROR] Token exchange failed:", tokenData);
      throw new Error(tokenData.error_description || "Token exchange failed");
    }
    console.log("[Auth] Token exchange successful");

    // Get user data
    console.log("[Auth] Fetching user data");
    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    if (!userResponse.ok) {
      console.error("[Auth ERROR] User data fetch failed:", userData);
      throw new Error("Failed to fetch user data");
    }
    console.log("[Auth] User data fetched successfully");

    // Get guild member data
    console.log("[Auth] Fetching guild member data");
    const memberResponse = await fetch(
      `${DISCORD_API}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    const memberData = await memberResponse.json();
    if (!memberResponse.ok) {
      console.error("[Auth ERROR] Member data fetch failed:", memberData);
      throw new Error("Failed to fetch member data");
    }
    console.log("[Auth] Guild member data fetched successfully");

    // Create session token
    const sessionToken = jwt.sign(
      {
        userId: userData.id,
        roles: memberData.roles || [],
        username: userData.username,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Get cookie config
    const cookieConfig = getCookieConfig(24 * 60 * 60 * 1000);
    console.log("[Auth] Setting cookie with config:", cookieConfig);

    // Set secure HTTP-only cookie
    res.cookie("session", sessionToken, cookieConfig);

    const roles = memberData.roles || [];
    const isMasterUser = hasMasterRole(roles);
    const weaponPerms = Object.entries(WEAPON_LEAD_ROLES)
      .filter(([roleId]) => roles.includes(roleId))
      .map(([, weapons]) => weapons);

    // Log user access details
    console.log(`
[Auth] User Login:
  Username: ${userData.username}
  ID: ${userData.id}
  Master Access: ${isMasterUser ? "Yes" : "No"}
  Weapon Lead Access: ${weaponPerms.length > 0 ? "Yes" : "No"}
  Weapon Permissions: ${
    weaponPerms.length > 0
      ? weaponPerms.map((w) => `\n    - ${w.primary}/${w.secondary}`).join("")
      : "None"
  }
  Cookie Domain: ${cookieConfig.domain || "not set"}
  Cookie SameSite: ${cookieConfig.sameSite}
  Cookie Secure: ${cookieConfig.secure}`);

    res.json({
      user: {
        id: userData.id,
        username: userData.username,
        roles,
        isMaster: isMasterUser,
        hasAccess: hasAnyRequiredRole(roles),
        weaponPermissions: weaponPerms,
      },
    });
  } catch (error) {
    console.error("[Auth ERROR] Auth error details:", error);
    res.status(500).json({
      error: "Authentication failed",
      details: error.message,
    });
  }
});

// Verify session and return user data
app.get("/auth/verify", (req, res) => {
  const token = req.cookies.session;

  if (!token) {
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const roles = decoded.roles;
    const isMasterUser = hasMasterRole(roles);
    const weaponPerms = Object.entries(WEAPON_LEAD_ROLES)
      .filter(([roleId]) => roles.includes(roleId))
      .map(([, weapons]) => weapons);

    res.json({
      user: {
        id: decoded.userId,
        username: decoded.username,
        roles,
        isMaster: isMasterUser,
        hasAccess: hasAnyRequiredRole(roles),
        weaponPermissions: weaponPerms,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    clearInvalidSession(res);
    res.status(401).json({ error: "Invalid session" });
  }
});

// Logout endpoint
app.post("/auth/logout", (req, res) => {
  res.clearCookie("session", {
    ...getCookieConfig(0), // Use 0 for maxAge to expire immediately
  });
  res.json({ message: "Logged out successfully" });
});

// Role verification middleware
export const verifyRole = (requiredRoles) => (req, res, next) => {
  const token = req.cookies.session;

  if (!token) {
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const hasRole = decoded.roles.some((role) => requiredRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  } catch (error) {
    console.error("Role verification error:", error);
    clearInvalidSession(res);
    res.status(401).json({ error: "Invalid session" });
  }
};

// Weapon permission middleware
export const verifyWeaponPermission = (req, res, next) => {
  const token = req.cookies.session;
  const { primary, secondary } = req.body;

  if (!token) {
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!hasWeaponLeadPermission(decoded.roles, primary, secondary)) {
      return res
        .status(403)
        .json({ error: "No permission for this weapon combination" });
    }
    next();
  } catch (error) {
    console.error("Permission verification error:", error);
    clearInvalidSession(res);
    res.status(401).json({ error: "Invalid session" });
  }
};

// Example protected route using the middleware
app.post("/api/vod-check", verifyWeaponPermission, (req, res) => {
  // Handle VOD check logic here
  res.json({ success: true });
});

// Protected VOD update endpoint
app.post("/api/vod-update", validateVodUpdate, async (req, res) => {
  const token = req.cookies.session;
  const {
    discordId,
    checked,
    primary,
    secondary,
    notes,
    vod_check_date,
    gear_checked,
    gear_check_date,
    gear_score,
  } = req.body;

  if (!token) {
    return res.status(401).json({ error: "No session found" });
  }

  // Validate notes if provided
  if (notes !== undefined) {
    if (notes.length > 500) {
      return res
        .status(400)
        .json({ error: "Notes must be under 500 characters" });
    }
    // Allow more special characters but still prevent potentially harmful ones
    if (!/^[a-zA-Z0-9\s.,!?@#$%&*()_+=\-[\]{}|:;<>/'"`~]*$/.test(notes)) {
      return res
        .status(400)
        .json({ error: "Notes contain invalid characters" });
    }
  }

  // Validate gear_score if provided
  if (gear_score !== undefined && gear_score !== null) {
    const score = parseInt(gear_score);
    if (isNaN(score) || score < 0 || score > 5000) {
      return res.status(400).json({ error: "Invalid gear score value" });
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const roles = decoded.roles;

    // Check permissions - only weapon leads can edit their weapons
    if (!hasWeaponLeadPermission(roles, primary, secondary)) {
      console.log(
        `Permission denied for user ${decoded.username} trying to update VOD for ${primary}/${secondary}`
      );
      return res
        .status(403)
        .json({ error: "No permission for this weapon combination" });
    }

    // Update Appwrite document
    try {
      // First try to get existing document
      const existingDocs = await databases.listDocuments(
        env.APPWRITE_DATABASE_ID,
        env.APPWRITE_VOD_COLLECTION_ID,
        [Query.equal("discord_id", discordId)]
      );

      const updateData = {
        discord_id: discordId,
        has_vod: checked,
      };

      // Only include notes in update if it's provided
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      // Handle VOD check date
      if (checked === false) {
        // Reset VOD check date and lead when unchecking
        updateData.vod_check_date = null;
        updateData.vod_check_lead = null;
      } else if (vod_check_date !== undefined) {
        updateData.vod_check_date = vod_check_date;
        updateData.vod_check_lead = decoded.username;
      }

      // Handle gear check status and date
      if (gear_checked === false) {
        // Reset gear check date and lead when unchecking
        updateData.gear_check_date = null;
        updateData.gear_check_lead = null;
      } else if (gear_check_date !== undefined) {
        updateData.gear_check_date = gear_check_date;
        updateData.gear_check_lead = decoded.username;
      }

      // Include gear status if provided
      if (gear_checked !== undefined) {
        updateData.gear_checked = gear_checked;
      }

      // Include gear score if provided
      if (gear_score !== undefined) {
        updateData.gear_score =
          gear_score === null ? null : parseInt(gear_score);
      }

      if (existingDocs.documents.length > 0) {
        // Update existing document
        await databases.updateDocument(
          env.APPWRITE_DATABASE_ID,
          env.APPWRITE_VOD_COLLECTION_ID,
          existingDocs.documents[0].$id,
          updateData
        );
      } else {
        // Create new document
        await databases.createDocument(
          env.APPWRITE_DATABASE_ID,
          env.APPWRITE_VOD_COLLECTION_ID,
          ID.unique(),
          updateData
        );
      }

      res.json({ success: true });
    } catch (appwriteError) {
      console.error("Appwrite operation failed:", appwriteError);
      throw new Error("Failed to update VOD status in database");
    }
  } catch (error) {
    console.error("VOD update error:", error);
    res.status(500).json({ error: "Failed to update VOD status" });
  }
});

// Fetch VOD tracking data
app.get("/api/vod-tracking", async (req, res) => {
  const token = req.cookies.session;
  const { discordIds } = req.query;

  if (!token) {
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!hasAnyRequiredRole(decoded.roles)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const response = await databases.listDocuments(
      env.APPWRITE_DATABASE_ID,
      env.APPWRITE_VOD_COLLECTION_ID,
      [Query.equal("discord_id", discordIds.split(","))]
    );

    const vodMap = {};
    response.documents.forEach((doc) => {
      vodMap[doc.discord_id] = {
        has_vod: doc.has_vod,
        notes: doc.notes || "",
        vod_check_date: doc.vod_check_date || null,
        vod_check_lead: doc.vod_check_lead || null,
        gear_checked: doc.gear_checked || false,
        gear_check_date: doc.gear_check_date || null,
        gear_check_lead: doc.gear_check_lead || null,
        gear_score: doc.gear_score ?? "",
      };
    });

    res.json(vodMap);
  } catch (error) {
    console.error("VOD tracking fetch error:", error);
    if (error.name === "JsonWebTokenError") {
      clearInvalidSession(res);
      res.status(401).json({ error: "Invalid session" });
    } else {
      res.status(500).json({ error: "Failed to fetch VOD tracking" });
    }
  }
});

// New endpoint to fetch all data at once
app.get("/api/all-data", async (req, res) => {
  const token = req.cookies.session;
  console.log("[API] /api/all-data request received");

  if (!token) {
    console.log("[API] No session token found");
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!hasAnyRequiredRole(decoded.roles)) {
      console.log("[API] User lacks required roles");
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    console.log("[API] Fetching all data in parallel");

    // First get total counts - use limit(1) instead of limit(0)
    const [staticsCount, vodCount] = await Promise.all([
      databases.listDocuments(
        env.APPWRITE_DATABASE_ID,
        env.APPWRITE_STATICS_COLLECTION_ID,
        [Query.limit(1)]
      ),
      databases.listDocuments(
        env.APPWRITE_DATABASE_ID,
        env.APPWRITE_VOD_COLLECTION_ID,
        [Query.limit(1)]
      ),
    ]);

    const totalStatics = staticsCount.total;
    const totalVods = vodCount.total;
    console.log(
      `[API] Found ${totalStatics} total static assignments to fetch`
    );
    console.log(`[API] Found ${totalVods} total VOD records to fetch`);

    // Skip fetching if no records exist
    if (totalStatics === 0 && totalVods === 0) {
      const memberData = await fetchAndCacheMemberData();
      console.log("[API] No statics or VODs found, sending empty data");
      return res.json({
        members: memberData.members,
        uniqueValues: memberData.uniqueValues,
        vodTracking: {},
        statics: [],
      });
    }

    // Fetch statics in batches
    const batchSize = 100;
    const staticBatches = Math.ceil(totalStatics / batchSize);
    const vodBatches = Math.ceil(totalVods / batchSize);
    const allStatics = [];
    const allVods = [];

    // Fetch both statics and vods in parallel batches
    const fetchPromises = [];

    // Only fetch statics if they exist
    if (totalStatics > 0) {
      for (let i = 0; i < staticBatches; i++) {
        fetchPromises.push(
          (async () => {
            console.log(
              `[API] Fetching statics batch ${
                i + 1
              }/${staticBatches} (${batchSize} per batch)`
            );
            const response = await databases.listDocuments(
              env.APPWRITE_DATABASE_ID,
              env.APPWRITE_STATICS_COLLECTION_ID,
              [
                Query.limit(batchSize),
                Query.offset(i * batchSize),
                Query.orderAsc("group"),
              ]
            );
            allStatics.push(...response.documents);
          })()
        );
      }
    }

    // Only fetch VODs if they exist
    if (totalVods > 0) {
      for (let i = 0; i < vodBatches; i++) {
        fetchPromises.push(
          (async () => {
            console.log(
              `[API] Fetching VOD batch ${
                i + 1
              }/${vodBatches} (${batchSize} per batch)`
            );
            const response = await databases.listDocuments(
              env.APPWRITE_DATABASE_ID,
              env.APPWRITE_VOD_COLLECTION_ID,
              [Query.limit(batchSize), Query.offset(i * batchSize)]
            );
            allVods.push(...response.documents);
          })()
        );
      }
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises);

    // Fetch member data
    const memberData = await fetchAndCacheMemberData();

    console.log(`[API] Found ${allVods.length} VOD records`);
    console.log(`[API] Found ${allStatics.length} static group assignments`);

    // Convert VOD data to a map for easier client-side lookup
    const vodMap = {};
    allVods.forEach((doc) => {
      vodMap[doc.discord_id] = {
        has_vod: doc.has_vod,
        notes: doc.notes || "",
        vod_check_date: doc.vod_check_date || null,
        vod_check_lead: doc.vod_check_lead || null,
        gear_checked: doc.gear_checked || false,
        gear_check_date: doc.gear_check_date || null,
        gear_check_lead: doc.gear_check_lead || null,
        gear_score: doc.gear_score ?? "",
      };
    });

    console.log("[API] Sending response");
    res.json({
      members: memberData.members,
      uniqueValues: memberData.uniqueValues,
      vodTracking: vodMap,
      statics: allStatics,
    });
  } catch (error) {
    console.error("[API ERROR] Error fetching all data:", error);
    if (error.name === "JsonWebTokenError") {
      clearInvalidSession(res);
      res.status(401).json({ error: "Invalid session" });
    } else {
      res.status(500).json({ error: "Failed to fetch data" });
    }
  }
});

// Update statics endpoint to use the same fix
app.get("/api/statics", async (req, res) => {
  const token = req.cookies.session;

  if (!token) {
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!hasMasterRole(decoded.roles)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get total count first - use limit(1) instead of limit(0)
    const countResponse = await databases.listDocuments(
      env.APPWRITE_DATABASE_ID,
      env.APPWRITE_STATICS_COLLECTION_ID,
      [Query.limit(1)]
    );
    const total = countResponse.total;

    // Return empty array if no records exist
    if (total === 0) {
      return res.json({ groups: [] });
    }

    // Fetch all documents in batches
    const batchSize = 100;
    const batches = Math.ceil(total / batchSize);
    const allStatics = [];

    for (let i = 0; i < batches; i++) {
      const response = await databases.listDocuments(
        env.APPWRITE_DATABASE_ID,
        env.APPWRITE_STATICS_COLLECTION_ID,
        [
          Query.limit(batchSize),
          Query.offset(i * batchSize),
          Query.orderAsc("group"),
        ]
      );
      allStatics.push(...response.documents);
    }

    res.json({ groups: allStatics });
  } catch (error) {
    console.error("Error fetching static groups:", error);
    if (error.name === "JsonWebTokenError") {
      clearInvalidSession(res);
      res.status(401).json({ error: "Invalid session" });
    } else {
      res.status(500).json({ error: "Failed to fetch static groups" });
    }
  }
});

app.post("/api/statics/update", async (req, res) => {
  const token = req.cookies.session;

  if (!token) {
    return res.status(401).json({ error: "No session found" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!hasMasterRole(decoded.roles)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { discordId, group } = req.body;
    if (!discordId || (group !== null && (group < 1 || group > 12))) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    console.log(
      `[API] Updating static group for ${discordId} to ${
        group === null ? "null" : group
      }`
    );

    // Check if member exists in statics collection
    const existingDocs = await databases.listDocuments(
      env.APPWRITE_DATABASE_ID,
      env.APPWRITE_STATICS_COLLECTION_ID,
      [Query.equal("discord_id", discordId)]
    );

    if (existingDocs.documents.length > 0) {
      const doc = existingDocs.documents[0];
      if (group === null) {
        // Remove from group
        console.log(`[API] Removing member ${discordId} from static group`);
        await databases.deleteDocument(
          env.APPWRITE_DATABASE_ID,
          env.APPWRITE_STATICS_COLLECTION_ID,
          doc.$id
        );
      } else {
        // Update group
        console.log(`[API] Updating member ${discordId} to group ${group}`);
        await databases.updateDocument(
          env.APPWRITE_DATABASE_ID,
          env.APPWRITE_STATICS_COLLECTION_ID,
          doc.$id,
          {
            group,
          }
        );
      }
    } else if (group !== null) {
      // Create new record only if assigning to a group
      console.log(
        `[API] Creating new static group entry for member ${discordId} in group ${group}`
      );
      await databases.createDocument(
        env.APPWRITE_DATABASE_ID,
        env.APPWRITE_STATICS_COLLECTION_ID,
        ID.unique(),
        {
          discord_id: discordId,
          group,
        }
      );
    }

    // Fetch updated statics to return to client
    const updatedStatics = await databases.listDocuments(
      env.APPWRITE_DATABASE_ID,
      env.APPWRITE_STATICS_COLLECTION_ID
    );

    res.json({
      success: true,
      statics: updatedStatics.documents,
    });
  } catch (error) {
    console.error("[API ERROR] Error updating static group:", error);
    if (error.name === "JsonWebTokenError") {
      clearInvalidSession(res);
      res.status(401).json({ error: "Invalid session" });
    } else {
      res.status(500).json({ error: "Failed to update static group" });
    }
  }
});

// Add error handling middleware at the end of all routes
app.use(errorHandler);

// Catch-all route for client-side routing in production (must be after API routes)
if (env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
}

// Use development port (6543) if in dev mode, otherwise use env.PORT or 3456
const PORT = process.env.NODE_ENV === "development" ? 6543 : env.PORT || 3456;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});
