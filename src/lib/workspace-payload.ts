import type {
  ActivityLogEntry,
  BudgetItem,
  EventItem,
  EventTask,
  FileEntry,
  Guest,
  Notification,
  TimelineItem,
  Vendor,
} from "./eventflow-types";

/** Full client state loaded from PostgreSQL for the signed-in user */
export type WorkspacePayload = {
  events: EventItem[];
  tasks: Record<number, EventTask[]>;
  timelines: Record<number, TimelineItem[]>;
  guests: Record<number, Guest[]>;
  vendors: Record<number, Vendor[]>;
  budgets: Record<number, BudgetItem[]>;
  files: Record<number, FileEntry[]>;
  logs: Record<number, ActivityLogEntry[]>;
  notifications: Notification[];
};
