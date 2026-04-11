import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "./db";
import {
  users,
  authAccounts,
  sessions,
  verificationTokens,
} from "@wimm/db/schema";

function getAuthConfig() {
  return {
    adapter: DrizzleAdapter(getDb() as any, {
      usersTable: users as any,
      accountsTable: authAccounts as any,
      sessionsTable: sessions as any,
      verificationTokensTable: verificationTokens as any,
    }),
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
    session: {
      strategy: "database" as const,
    },
    pages: {
      signIn: "/login",
    },
    callbacks: {
      session({ session, user }: any) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
    },
  };
}

let _auth: ReturnType<typeof NextAuth> | null = null;

function getAuth() {
  if (!_auth) {
    _auth = NextAuth(getAuthConfig());
  }
  return _auth;
}

export const handlers = {
  GET: (req: any) => getAuth().handlers.GET(req),
  POST: (req: any) => getAuth().handlers.POST(req),
};

export const auth: any = (...args: any[]) => (getAuth() as any).auth(...args);
export const signIn: any = (...args: any[]) => (getAuth() as any).signIn(...args);
export const signOut: any = (...args: any[]) => (getAuth() as any).signOut(...args);
