export type AuthUser = { id: number; name: string; email: string };

export type EventType = "wedding" | "birthday" | "corporate" | "other";

export type EventItem = {
  id: number;
  name: string;
  type: EventType;
  date: string;
  location: string;
  notes: string;
};

export type TaskPriority = "high" | "medium" | "low";

export type EventTask = {
  id: number;
  title: string;
  dueDate?: string;
  priority: TaskPriority;
  notes: string;
  done: boolean;
};

export type TimelineStatus = "pending" | "ongoing" | "done";

export type TimelineItem = {
  id: number;
  time: string;
  activity: string;
  notes: string;
  status: TimelineStatus;
};

export type GuestStatus = "invited" | "confirmed" | "declined";

export type Guest = {
  id: number;
  name: string;
  contact: string;
  status: GuestStatus;
  table: number | null;
};

export type VendorStatus = "pending" | "active" | "cancelled";
export type VendorContract = "none" | "signed" | "pending";

export type Vendor = {
  id: number;
  name: string;
  category: string;
  contact: string;
  contract: VendorContract;
  amount: number;
  status: VendorStatus;
  notes: string;
};

export type BudgetItem = {
  id: number;
  name: string;
  budget: number;
  actual: number;
};

export type FileEntry = {
  id: number;
  name: string;
  size: string;
  date: string;
};

export type ActivityLogEntry = {
  id: number;
  text: string;
  time: string;
};

export type Notification = {
  id: number;
  text: string;
  color: string;
  time: string;
  read: boolean;
};

export type AppView = "dashboard" | "events" | "analytics" | "event-detail";

export type EventDetailTab =
  | "overview"
  | "tasks"
  | "timeline"
  | "guests"
  | "vendors"
  | "budget"
  | "runsheet"
  | "files";
