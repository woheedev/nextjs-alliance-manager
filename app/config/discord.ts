export const DISCORD_API = "https://discord.com/api/v10";

interface WeaponRole {
  primary: string;
  secondary: string;
}

export const WEAPON_LEAD_ROLES: Record<string, WeaponRole> = {
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

export const LEADERSHIP_ROLES = ["1309271313398894643"];
export const MASTER_ROLES = ["1309271313398894643", "1309284427553312769"];

export const discordConfig = {
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  guildId: process.env.DISCORD_GUILD_ID!,
  guilds: {
    guild1: process.env.DISCORD_GUILD_1_NAME!,
    guild2: process.env.DISCORD_GUILD_2_NAME!,
    guild3: process.env.DISCORD_GUILD_3_NAME!,
    guild4: process.env.DISCORD_GUILD_4_NAME!,
  },
  webhooks: {
    guild1: process.env.DISCORD_GUILD_1_WEBHOOK!,
    guild2: process.env.DISCORD_GUILD_2_WEBHOOK!,
    guild3: process.env.DISCORD_GUILD_3_WEBHOOK!,
    guild4: process.env.DISCORD_GUILD_4_WEBHOOK!,
  },
};
