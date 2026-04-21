/**
 * Seed demo user + sample events (run after `npm run db:push`).
 * Usage: DATABASE_URL=... SESSION_SECRET=... npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import {
  SEED_BUDGETS,
  SEED_EVENTS,
  SEED_FILES,
  SEED_GUESTS,
  SEED_LOGS,
  SEED_NOTIFICATIONS,
  SEED_TASKS,
  SEED_TIMELINES,
  SEED_VENDORS,
  deepCloneSeed,
} from "../src/lib/eventflow-seed";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const email = "admin@eventflow.io";
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing.length) {
    console.log("Demo user already exists, skipping seed.");
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash("password", 10);
  const [user] = await db
    .insert(schema.users)
    .values({ email, passwordHash, name: "Maria Santos" })
    .returning();
  const userId = user.id;

  for (const n of deepCloneSeed(SEED_NOTIFICATIONS)) {
    await db.insert(schema.notifications).values({
      userId,
      text: n.text,
      color: n.color,
      timeLabel: n.time,
      read: n.read,
    });
  }

  const events = deepCloneSeed(SEED_EVENTS);
  const idMap = new Map<number, number>();

  for (const ev of events) {
    const oldId = ev.id;
    const [row] = await db
      .insert(schema.events)
      .values({
        userId,
        name: ev.name,
        type: ev.type,
        eventDate: ev.date,
        location: ev.location,
        notes: ev.notes ?? "",
      })
      .returning();
    idMap.set(oldId, row.id);
  }

  function nid(old: number): number {
    const v = idMap.get(old);
    if (v == null) throw new Error(`Missing mapped event id for ${old}`);
    return v;
  }

  for (const [oldEid, list] of Object.entries(deepCloneSeed(SEED_TASKS))) {
    const eid = nid(Number(oldEid));
    for (const t of list) {
      await db.insert(schema.eventTasks).values({
        eventId: eid,
        title: t.title,
        dueDate: t.dueDate || null,
        priority: t.priority,
        notes: t.notes,
        done: t.done,
      });
    }
  }

  for (const [oldEid, list] of Object.entries(deepCloneSeed(SEED_TIMELINES))) {
    const eid = nid(Number(oldEid));
    for (const t of list) {
      await db.insert(schema.timelineItems).values({
        eventId: eid,
        time: t.time,
        activity: t.activity,
        notes: t.notes,
        status: t.status,
      });
    }
  }

  for (const [oldEid, list] of Object.entries(deepCloneSeed(SEED_GUESTS))) {
    const eid = nid(Number(oldEid));
    for (const g of list) {
      await db.insert(schema.guests).values({
        eventId: eid,
        name: g.name,
        contact: g.contact,
        status: g.status,
        tableNum: g.table,
      });
    }
  }

  for (const [oldEid, list] of Object.entries(deepCloneSeed(SEED_VENDORS))) {
    const eid = nid(Number(oldEid));
    for (const v of list) {
      await db.insert(schema.vendors).values({
        eventId: eid,
        name: v.name,
        category: v.category,
        contact: v.contact,
        contract: v.contract,
        amount: v.amount,
        status: v.status,
        notes: v.notes,
      });
    }
  }

  for (const [oldEid, list] of Object.entries(deepCloneSeed(SEED_BUDGETS))) {
    const eid = nid(Number(oldEid));
    for (const b of list) {
      await db.insert(schema.budgetItems).values({
        eventId: eid,
        name: b.name,
        budget: b.budget,
        actual: b.actual,
      });
    }
  }

  for (const [oldEid, list] of Object.entries(deepCloneSeed(SEED_FILES))) {
    const eid = nid(Number(oldEid));
    for (const f of list) {
      await db.insert(schema.fileEntries).values({
        eventId: eid,
        name: f.name,
        size: f.size,
        fileDate: f.date,
      });
    }
  }

  for (const [oldEid, list] of Object.entries(deepCloneSeed(SEED_LOGS))) {
    const eid = nid(Number(oldEid));
    for (const l of list) {
      await db.insert(schema.activityLogs).values({
        eventId: eid,
        text: l.text,
        time: l.time,
      });
    }
  }

  console.log("Seed complete. Sign in with admin@eventflow.io / password");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
