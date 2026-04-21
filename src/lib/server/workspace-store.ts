import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  activityLogs,
  budgetItems,
  eventTasks,
  events,
  fileEntries,
  guests,
  notifications,
  timelineItems,
  vendors,
} from "@/db/schema";
import type {
  ActivityLogEntry,
  BudgetItem,
  EventItem,
  EventTask,
  EventType,
  FileEntry,
  Guest,
  GuestStatus,
  TimelineItem,
  TimelineStatus,
  Vendor,
} from "@/lib/eventflow-types";
import type { WorkspacePayload } from "@/lib/workspace-payload";

export type { WorkspacePayload };

function fmtDate(d: unknown): string {
  if (d == null) return "";
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export async function loadWorkspace(db: Db, userId: number): Promise<WorkspacePayload> {
  const evRows = await db.select().from(events).where(eq(events.userId, userId)).orderBy(desc(events.createdAt));
  const eventIds = evRows.map((e) => e.id);
  const eventList: EventItem[] = evRows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as EventType,
    date: fmtDate(r.eventDate),
    location: r.location,
    notes: r.notes ?? "",
  }));

  if (eventIds.length === 0) {
    const notifRows = await db.select().from(notifications).where(eq(notifications.userId, userId));
    return {
      events: [],
      tasks: {},
      timelines: {},
      guests: {},
      vendors: {},
      budgets: {},
      files: {},
      logs: {},
      notifications: notifRows.map((n) => ({
        id: n.id,
        text: n.text,
        color: n.color,
        time: n.timeLabel,
        read: n.read,
      })),
    };
  }

  const [taskRows, tlRows, guestRows, vendorRows, budgetRows, fileRows, logRows] = await Promise.all([
    db.select().from(eventTasks).where(inArray(eventTasks.eventId, eventIds)),
    db.select().from(timelineItems).where(inArray(timelineItems.eventId, eventIds)),
    db.select().from(guests).where(inArray(guests.eventId, eventIds)),
    db.select().from(vendors).where(inArray(vendors.eventId, eventIds)),
    db.select().from(budgetItems).where(inArray(budgetItems.eventId, eventIds)),
    db.select().from(fileEntries).where(inArray(fileEntries.eventId, eventIds)),
    db.select().from(activityLogs).where(inArray(activityLogs.eventId, eventIds)).orderBy(desc(activityLogs.createdAt)),
  ]);

  const tasks: Record<number, EventTask[]> = {};
  for (const eid of eventIds) tasks[eid] = [];
  for (const t of taskRows) {
    (tasks[t.eventId] ??= []).push({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate ? fmtDate(t.dueDate) : undefined,
      priority: t.priority as EventTask["priority"],
      notes: t.notes ?? "",
      done: t.done,
    });
  }

  const timelines: Record<number, TimelineItem[]> = {};
  for (const eid of eventIds) timelines[eid] = [];
  for (const t of tlRows) {
    (timelines[t.eventId] ??= []).push({
      id: t.id,
      time: t.time,
      activity: t.activity,
      notes: t.notes ?? "",
      status: t.status as TimelineStatus,
    });
  }

  const guestsBy: Record<number, Guest[]> = {};
  for (const eid of eventIds) guestsBy[eid] = [];
  for (const g of guestRows) {
    (guestsBy[g.eventId] ??= []).push({
      id: g.id,
      name: g.name,
      contact: g.contact ?? "",
      status: g.status as GuestStatus,
      table: g.tableNum,
    });
  }

  const vendorsBy: Record<number, Vendor[]> = {};
  for (const eid of eventIds) vendorsBy[eid] = [];
  for (const v of vendorRows) {
    (vendorsBy[v.eventId] ??= []).push({
      id: v.id,
      name: v.name,
      category: v.category,
      contact: v.contact ?? "",
      contract: v.contract as Vendor["contract"],
      amount: v.amount,
      status: v.status as Vendor["status"],
      notes: v.notes ?? "",
    });
  }

  const budgets: Record<number, BudgetItem[]> = {};
  for (const eid of eventIds) budgets[eid] = [];
  for (const b of budgetRows) {
    (budgets[b.eventId] ??= []).push({
      id: b.id,
      name: b.name,
      budget: b.budget,
      actual: b.actual,
    });
  }

  const files: Record<number, FileEntry[]> = {};
  for (const eid of eventIds) files[eid] = [];
  for (const f of fileRows) {
    (files[f.eventId] ??= []).push({
      id: f.id,
      name: f.name,
      size: f.size,
      date: f.fileDate,
    });
  }

  const logs: Record<number, ActivityLogEntry[]> = {};
  for (const eid of eventIds) logs[eid] = [];
  for (const l of logRows) {
    (logs[l.eventId] ??= []).push({
      id: l.id,
      text: l.text,
      time: l.time,
    });
  }

  const notifRows = await db.select().from(notifications).where(eq(notifications.userId, userId));

  return {
    events: eventList,
    tasks,
    timelines,
    guests: guestsBy,
    vendors: vendorsBy,
    budgets,
    files,
    logs,
    notifications: notifRows.map((n) => ({
      id: n.id,
      text: n.text,
      color: n.color,
      time: n.timeLabel,
      read: n.read,
    })),
  };
}

export async function assertEventOwned(db: Db, userId: number, eventId: number) {
  const [row] = await db.select().from(events).where(and(eq(events.id, eventId), eq(events.userId, userId)));
  if (!row) throw new Error("Event not found");
  return row;
}

export async function insertActivityLog(db: Db, eventId: number, text: string) {
  const time = new Date().toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  await db.insert(activityLogs).values({ eventId, text, time });
}
