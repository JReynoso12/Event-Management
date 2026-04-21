import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  eventDate: date("event_date").notNull(),
  location: text("location").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventTasks = pgTable("event_tasks", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  notes: text("notes").notNull().default(""),
  done: boolean("done").notNull().default(false),
});

export const timelineItems = pgTable("timeline_items", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  time: varchar("time", { length: 16 }).notNull(),
  activity: text("activity").notNull(),
  notes: text("notes").notNull().default(""),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
});

export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  contact: text("contact").notNull().default(""),
  status: varchar("status", { length: 16 }).notNull().default("invited"),
  tableNum: integer("table_num"),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  contact: text("contact").notNull().default(""),
  contract: varchar("contract", { length: 16 }).notNull().default("none"),
  amount: integer("amount").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  notes: text("notes").notNull().default(""),
});

export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  budget: integer("budget").notNull().default(0),
  actual: integer("actual").notNull().default(0),
});

export const fileEntries = pgTable("file_entries", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  size: varchar("size", { length: 32 }).notNull(),
  fileDate: varchar("file_date", { length: 32 }).notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  text: text("text").notNull(),
  time: varchar("time", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  text: text("text").notNull(),
  color: varchar("color", { length: 16 }).notNull(),
  timeLabel: varchar("time_label", { length: 64 }).notNull(),
  read: boolean("read").notNull().default(false),
});
