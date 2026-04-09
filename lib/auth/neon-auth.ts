import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db/index";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateHashedPassword } from "@/lib/db/utils";
import { generateUUID } from "@/lib/utils";

// Neon Auth Configuration
export const NEON_AUTH_URL = process.env.NEON_AUTH_BASE_URL || "";
export const NEON_AUTH_SECRET = process.env.NEON_AUTH_COOKIE_SECRET || "";

// User type for backward compatibility
export type UserType = "guest" | "regular";

// Cookie names
const SESSION_COOKIE = "neon_auth_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface Session {
  user: SessionUser;
  expiresAt: Date;
}

// Get the secret key for signing/verifying JWTs
async function getSecretKey() {
  const secret = NEON_AUTH_SECRET;
  if (!secret) {
    throw new Error("NEON_AUTH_COOKIE_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

// Create a session token
export async function createSessionToken(user: SessionUser): Promise<string> {
  const secretKey = await getSecretKey();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    exp: Math.floor(expiresAt.getTime() / 1000),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secretKey);

  return token;
}

// Verify a session token
export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const secretKey = await getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    if (!payload.sub || !payload.email) {
      return null;
    }

    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string | undefined,
        image: payload.image as string | undefined,
      },
      expiresAt: new Date((payload.exp as number) * 1000),
    };
  } catch {
    return null;
  }
}

// Get the current session
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Auth functions
export async function signUp(email: string, password: string, name?: string) {
  // Check if user exists in our database
  const [existingUser] = await db.select().from(user).where(eq(user.email, email));

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Create user in our database
  const hashedPassword = generateHashedPassword(password);
  const [newUser] = await db.insert(user).values({
    email,
    password: hashedPassword,
    name: name || email.split("@")[0],
  }).returning();

  // Create session
  const token = await createSessionToken({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    image: newUser.image,
  });

  await setSessionCookie(token);

  return newUser;
}

export async function signInWithEmail(email: string, password: string) {
  // Get user from database
  const [existingUser] = await db.select().from(user).where(eq(user.email, email));

  if (!existingUser || !existingUser.password) {
    throw new Error("Invalid credentials");
  }

  // Verify password
  const { compare } = await import("bcrypt-ts");
  const isValid = await compare(password, existingUser.password);

  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Create session
  const token = await createSessionToken({
    id: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    image: existingUser.image,
  });

  await setSessionCookie(token);

  return existingUser;
}

export async function signOut() {
  await clearSessionCookie();
}

export async function createGuestSession() {
  // Create a guest user
  const guestEmail = `guest-${Date.now()}@navya.ai`;
  const guestPassword = generateUUID();

  const [guestUser] = await db.insert(user).values({
    email: guestEmail,
    password: generateHashedPassword(guestPassword),
    name: "Guest",
    isAnonymous: true,
  }).returning();

  // Create session
  const token = await createSessionToken({
    id: guestUser.id,
    email: guestUser.email,
    name: guestUser.name,
    image: guestUser.image,
  });

  await setSessionCookie(token);

  return guestUser;
}

// Export auth function for compatibility with existing code
export async function auth() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      type: "regular" as const,
    },
    expires: session.expiresAt.toISOString(),
  };
}
