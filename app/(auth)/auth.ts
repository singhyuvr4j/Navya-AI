// Re-export auth functions from neon-auth for backward compatibility
export {
  auth,
  getSession,
  signInWithEmail,
  signUp,
  signOut,
  createGuestSession,
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  NEON_AUTH_URL,
  NEON_AUTH_SECRET,
} from "@/lib/auth/neon-auth";

export type { SessionUser, Session } from "@/lib/auth/neon-auth";
