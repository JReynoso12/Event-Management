"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { budgetItems, eventTasks, events, fileEntries, guests, notifications, timelineItems, vendors } from "@/db/schema";
import { clearSessionCookie, createSessionToken, readSessionUserId, setSessionCookie } from "@/lib/server/auth-session";
import { createUser, findUserByEmail, findUserById, toAuthUser, verifyLogin } from "@/lib/server/users-store";
import { assertEventOwned, insertActivityLog, loadWorkspace } from "@/lib/server/workspace-store";
import type { WorkspacePayload } from "@/lib/workspace-payload";
import type {
  AuthUser,
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

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

function noDb(): Err {
  return { ok: false, error: "Database is not configured (set DATABASE_URL)." };
}

type DbInstance = NonNullable<ReturnType<typeof getDb>>;
type SessionResult = { ok: true; db: DbInstance; userId: number } | Err;

async function requireSession(): Promise<SessionResult> {
  const db = getDb();
  if (!db) return noDb();
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  return { ok: true, db, userId };
}

export async function getSessionAction(): Promise<{ user: AuthUser | null }> {
  const db = getDb();
  if (!db) return { user: null };
  const userId = await readSessionUserId();
  if (!userId) return { user: null };
  const row = await findUserById(db, userId);
  if (!row) return { user: null };
  return { user: toAuthUser(row) };
}

export async function registerAction(
  name: string,
  email: string,
  password: string,
): Promise<Ok<{ message: string }> | Err> {
  const db = getDb();
  if (!db) return noDb();
  if (!name?.trim() || !email?.trim() || !password) return { ok: false, error: "All fields are required." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (await findUserByEmail(db, email)) return { ok: false, error: "Email already registered." };
  await createUser(db, name.trim(), email.trim(), password);
  return { ok: true, message: "Registration successful. Please sign in with your email and password." };
}

export async function loginAction(email: string, password: string): Promise<Ok<{ user: AuthUser; workspace: WorkspacePayload }> | Err> {
  const db = getDb();
  if (!db) return noDb();
  const user = await verifyLogin(db, email, password);
  if (!user) return { ok: false, error: "Invalid email or password." };
  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  const workspace = await loadWorkspace(db, user.id);
  return { ok: true, user: toAuthUser(user), workspace };
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
}

export async function loadWorkspaceAction(): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const workspace = await loadWorkspace(s.db, s.userId);
  return { ok: true, workspace };
}

export async function createEventAction(input: {
  name: string;
  type: EventType;
  date: string;
  location: string;
  notes: string;
}): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  if (!input.name?.trim() || !input.date || !input.location?.trim()) return { ok: false, error: "Missing required fields." };
  const [ev] = await db
    .insert(events)
    .values({
      userId,
      name: input.name.trim(),
      type: input.type,
      eventDate: input.date,
      location: input.location.trim(),
      notes: input.notes ?? "",
    })
    .returning();
  await insertActivityLog(db, ev.id, "Event created");
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function updateEventAction(
  id: number,
  input: Partial<Pick<EventItem, "name" | "type" | "date" | "location" | "notes">>,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, id);
  const patch: Partial<typeof events.$inferInsert> = {};
  if (input.name != null) patch.name = input.name;
  if (input.type != null) patch.type = input.type;
  if (input.date != null) patch.eventDate = input.date;
  if (input.location != null) patch.location = input.location;
  if (input.notes != null) patch.notes = input.notes;
  if (Object.keys(patch).length) await db.update(events).set(patch).where(eq(events.id, id));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function deleteEventAction(id: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, id);
  await db.delete(events).where(eq(events.id, id));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function createTaskAction(
  eventId: number,
  input: Pick<EventTask, "title" | "priority" | "notes"> & { dueDate?: string },
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  if (!input.title?.trim()) return { ok: false, error: "Task title is required." };
  await db.insert(eventTasks).values({
    eventId,
    title: input.title.trim(),
    dueDate: input.dueDate || null,
    priority: input.priority,
    notes: input.notes ?? "",
    done: false,
  });
  await insertActivityLog(db, eventId, `Added task: ${input.title.trim()}`);
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function updateTaskAction(
  eventId: number,
  taskId: number,
  patch: Partial<Pick<EventTask, "title" | "dueDate" | "priority" | "notes" | "done">>,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.dueDate !== undefined) row.dueDate = patch.dueDate || null;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.done !== undefined) row.done = patch.done;
  if (Object.keys(row).length)
    await db.update(eventTasks).set(row as typeof eventTasks.$inferInsert).where(and(eq(eventTasks.id, taskId), eq(eventTasks.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function deleteTaskAction(eventId: number, taskId: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.delete(eventTasks).where(and(eq(eventTasks.id, taskId), eq(eventTasks.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function createTimelineAction(
  eventId: number,
  input: Pick<TimelineItem, "time" | "activity" | "notes" | "status">,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  if (!input.time || !input.activity?.trim()) return { ok: false, error: "Time and activity are required." };
  await db.insert(timelineItems).values({
    eventId,
    time: input.time,
    activity: input.activity.trim(),
    notes: input.notes ?? "",
    status: input.status,
  });
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function updateTimelineAction(
  eventId: number,
  itemId: number,
  input: Partial<Pick<TimelineItem, "time" | "activity" | "notes" | "status">>,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  const row: Record<string, unknown> = {};
  if (input.time !== undefined) row.time = input.time;
  if (input.activity !== undefined) row.activity = input.activity;
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.status !== undefined) row.status = input.status;
  if (Object.keys(row).length)
    await db
      .update(timelineItems)
      .set(row as typeof timelineItems.$inferInsert)
      .where(and(eq(timelineItems.id, itemId), eq(timelineItems.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function deleteTimelineAction(eventId: number, itemId: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.delete(timelineItems).where(and(eq(timelineItems.id, itemId), eq(timelineItems.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function markAllTimelineDoneAction(eventId: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.update(timelineItems).set({ status: "done" }).where(eq(timelineItems.eventId, eventId));
  await insertActivityLog(db, eventId, "Marked all timeline items as done");
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function createGuestAction(eventId: number, input: Omit<Guest, "id">): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  if (!input.name?.trim()) return { ok: false, error: "Guest name is required." };
  await db.insert(guests).values({
    eventId,
    name: input.name.trim(),
    contact: input.contact ?? "",
    status: input.status,
    tableNum: input.table,
  });
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function updateGuestAction(
  eventId: number,
  guestId: number,
  input: Partial<Pick<Guest, "name" | "contact" | "status" | "table">>,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.contact !== undefined) row.contact = input.contact;
  if (input.status !== undefined) row.status = input.status;
  if (input.table !== undefined) row.tableNum = input.table;
  if (Object.keys(row).length)
    await db.update(guests).set(row as typeof guests.$inferInsert).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function deleteGuestAction(eventId: number, guestId: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.delete(guests).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function createVendorAction(eventId: number, input: Omit<Vendor, "id">): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  if (!input.name?.trim()) return { ok: false, error: "Vendor name is required." };
  await db.insert(vendors).values({
    eventId,
    name: input.name.trim(),
    category: input.category,
    contact: input.contact ?? "",
    contract: input.contract,
    amount: input.amount,
    status: input.status,
    notes: input.notes ?? "",
  });
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function updateVendorAction(
  eventId: number,
  vendorId: number,
  input: Partial<Omit<Vendor, "id">>,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  const row: Record<string, unknown> = {};
  for (const k of ["name", "category", "contact", "contract", "amount", "status", "notes"] as const) {
    if (input[k] !== undefined) row[k] = input[k];
  }
  if (Object.keys(row).length)
    await db.update(vendors).set(row as typeof vendors.$inferInsert).where(and(eq(vendors.id, vendorId), eq(vendors.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function deleteVendorAction(eventId: number, vendorId: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.delete(vendors).where(and(eq(vendors.id, vendorId), eq(vendors.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function createBudgetAction(eventId: number, input: Omit<BudgetItem, "id">): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  if (!input.name?.trim()) return { ok: false, error: "Item name is required." };
  await db.insert(budgetItems).values({
    eventId,
    name: input.name.trim(),
    budget: input.budget,
    actual: input.actual,
  });
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function updateBudgetAction(
  eventId: number,
  budgetId: number,
  input: Partial<Pick<BudgetItem, "name" | "budget" | "actual">>,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.budget !== undefined) row.budget = input.budget;
  if (input.actual !== undefined) row.actual = input.actual;
  if (Object.keys(row).length)
    await db
      .update(budgetItems)
      .set(row as typeof budgetItems.$inferInsert)
      .where(and(eq(budgetItems.id, budgetId), eq(budgetItems.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function deleteBudgetAction(eventId: number, budgetId: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.delete(budgetItems).where(and(eq(budgetItems.id, budgetId), eq(budgetItems.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function createFileAction(eventId: number, input: Omit<FileEntry, "id">): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.insert(fileEntries).values({
    eventId,
    name: input.name,
    size: input.size,
    fileDate: input.date,
  });
  await insertActivityLog(db, eventId, `Uploaded file: ${input.name}`);
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function deleteFileAction(eventId: number, fileId: number): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await db.delete(fileEntries).where(and(eq(fileEntries.id, fileId), eq(fileEntries.eventId, eventId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function addLogAction(eventId: number, text: string): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await assertEventOwned(db, userId, eventId);
  await insertActivityLog(db, eventId, text);
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function markNotificationReadAction(id: number, read: boolean): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await db.update(notifications).set({ read }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function markAllNotificationsReadAction(): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  const s = await requireSession();
  if (!s.ok) return s;
  const { db, userId } = s;
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  return { ok: true, workspace: await loadWorkspace(db, userId) };
}

export async function updateGuestStatusAction(
  eventId: number,
  guestId: number,
  status: GuestStatus,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  return updateGuestAction(eventId, guestId, { status });
}

export async function updateTimelineStatusAction(
  eventId: number,
  itemId: number,
  status: TimelineStatus,
): Promise<Ok<{ workspace: WorkspacePayload }> | Err> {
  return updateTimelineAction(eventId, itemId, { status });
}
