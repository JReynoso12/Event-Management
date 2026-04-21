import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "eventflow_session";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 characters) when using the database backend.");
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function readSessionUserId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    if (!sub) return null;
    const id = Number(sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}
