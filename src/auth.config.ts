import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminArea = nextUrl.pathname.startsWith("/admin");
      const isPortalArea = nextUrl.pathname.startsWith("/portal");
      const isLoginPage = nextUrl.pathname.startsWith("/login");

      if ((isAdminArea || isPortalArea) && !isLoggedIn) {
        return false; // redirige a /login
      }

      if (isLoginPage && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;