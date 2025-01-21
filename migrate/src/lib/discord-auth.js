const API_URL = import.meta.env.PROD
  ? window.location.origin
  : `http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 6543}`;

const REDIRECT_URI = `${
  import.meta.env.PROD ? window.location.origin : "http://localhost:5173"
}/callback`;

const DISCORD_CLIENT_ID = "1320170014283665408";
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

// Utility function for controlled delays
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility function for retrying operations
const retry = async (operation, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(
        `[Auth] Retry attempt ${i + 1}/${retries} failed:`,
        error.message
      );
      lastError = error;
      if (i < retries - 1) {
        console.log(`[Auth] Waiting ${delay * (i + 1)}ms before next retry`);
        await wait(delay * (i + 1)); // Exponential backoff
      }
    }
  }
  throw lastError;
};

export const getDiscordUrl = () => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds.members.read",
  });

  return `https://discord.com/api/oauth2/authorize?${params}`;
};

export const exchangeCode = async (code) => {
  console.log("[Auth] Starting code exchange");
  const response = await fetch(
    `${API_URL}/auth/discord/callback?code=${code}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error("[Auth ERROR] Auth error response:", data);
    throw new Error(data.details || data.error || "Failed to authenticate");
  }

  console.log("[Auth] Code exchange successful, verifying session");

  // Verify session with retries and longer initial wait
  await retry(async () => {
    await wait(500); // Increased initial wait for cookie propagation
    const result = await verifySession();
    console.log("[Auth] Session verified successfully");
    return result;
  });

  return data;
};

export const verifySession = async () => {
  console.log("[Auth] Verifying session");
  const response = await fetch(`${API_URL}/auth/verify`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[Auth ERROR] Session verification failed:", error);
    throw new Error(error.error || "No valid session");
  }

  const data = await response.json();
  console.log("[Auth] Session verification successful");
  return data;
};

export const logout = async () => {
  console.log("[Auth] Logging out");
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("[Auth ERROR] Logout failed:", error);
      throw new Error(error.error || "Failed to logout");
    }

    console.log("[Auth] Logout successful");

    // Clear any local state or caches
    if (typeof window !== "undefined") {
      localStorage.clear(); // Clear all localStorage items to be safe
    }
  } catch (error) {
    console.error("[Auth ERROR] Logout error:", error);
    throw error;
  }
};
