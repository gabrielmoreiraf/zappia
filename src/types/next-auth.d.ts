import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "owner" | "member";
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: "owner" | "member";
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "owner" | "member";
    isAdmin?: boolean;
  }
}
