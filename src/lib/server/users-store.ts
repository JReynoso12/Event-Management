import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { Db } from "@/db/client";
import { users } from "@/db/schema";
import type { AuthUser } from "@/lib/eventflow-types";

export async function findUserByEmail(db: Db, email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return row ?? null;
}

export async function findUserById(db: Db, id: number) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function createUser(db: Db, name: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [row] = await db
    .insert(users)
    .values({
      name,
      email: email.toLowerCase(),
      passwordHash,
    })
    .returning();
  return row;
}

export async function verifyLogin(db: Db, email: string, password: string) {
  const user = await findUserByEmail(db, email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export function toAuthUser(row: { id: number; name: string; email: string }): AuthUser {
  return { id: row.id, name: row.name, email: row.email };
}
