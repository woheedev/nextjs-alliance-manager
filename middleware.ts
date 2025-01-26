import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ token }) {
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    "/",
    "/statics",
    "/api/all-data",
    "/api/statics/:path*",
    "/api/vod-update",
  ],
};
