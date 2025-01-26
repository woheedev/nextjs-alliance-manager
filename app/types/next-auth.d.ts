import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface JWT {
    roles?: string[];
  }
}
