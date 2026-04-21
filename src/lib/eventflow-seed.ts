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

export const SEED_EVENTS: EventItem[] = [
  {
    id: 1,
    name: "Santos–Cruz Wedding",
    type: "wedding",
    date: "2026-12-14",
    location: "Grand Ballroom, Cotabato City",
    notes: "Garden ceremony + indoor reception",
  },
  {
    id: 2,
    name: "TechCorp Annual Summit",
    type: "corporate",
    date: "2026-11-08",
    location: "SMX Convention Center, CDO",
    notes: "",
  },
];

export const SEED_TASKS: Record<number, EventTask[]> = {
  1: [
    {
      id: 1,
      title: "Confirm final headcount with caterer",
      dueDate: "2026-11-30",
      priority: "high",
      notes: "At least 2 weeks before",
      done: false,
    },
    {
      id: 2,
      title: "Collect remaining balance from couple",
      dueDate: "2026-12-01",
      priority: "high",
      notes: "",
      done: false,
    },
    {
      id: 3,
      title: "Finalize seating arrangement",
      dueDate: "2026-12-07",
      priority: "medium",
      notes: "",
      done: false,
    },
    {
      id: 4,
      title: "Confirm sound check schedule with band",
      dueDate: "2026-12-10",
      priority: "medium",
      notes: "",
      done: true,
    },
    {
      id: 5,
      title: "Print event runsheet for team",
      dueDate: "2026-12-13",
      priority: "low",
      notes: "",
      done: false,
    },
  ],
  2: [
    {
      id: 6,
      title: "Send invitations to speakers",
      dueDate: "2026-10-01",
      priority: "high",
      notes: "",
      done: true,
    },
    {
      id: 7,
      title: "Book accommodation for out-of-town guests",
      dueDate: "2026-10-15",
      priority: "medium",
      notes: "",
      done: false,
    },
  ],
};

export const SEED_TIMELINES: Record<number, TimelineItem[]> = {
  1: [
    {
      id: 1,
      time: "10:00",
      activity: "Guest arrival & registration",
      notes: "Assign ushers at gate",
      status: "done",
    },
    {
      id: 2,
      time: "11:00",
      activity: "Ceremony begins",
      notes: "Fr. Marco officiates",
      status: "ongoing",
    },
    {
      id: 3,
      time: "12:30",
      activity: "Cocktail hour",
      notes: "Garden area",
      status: "pending",
    },
    {
      id: 4,
      time: "14:00",
      activity: "Reception & lunch",
      notes: "Ballroom, 10 tables",
      status: "pending",
    },
    {
      id: 5,
      time: "16:00",
      activity: "Cake cutting",
      notes: "",
      status: "pending",
    },
    {
      id: 6,
      time: "17:00",
      activity: "First dance",
      notes: "",
      status: "pending",
    },
  ],
  2: [
    {
      id: 7,
      time: "08:00",
      activity: "Registration & networking",
      notes: "Coffee at lobby",
      status: "pending",
    },
    {
      id: 8,
      time: "09:00",
      activity: "Opening keynote",
      notes: "CEO presentation",
      status: "pending",
    },
  ],
};

export const SEED_GUESTS: Record<number, Guest[]> = {
  1: [
    {
      id: 1,
      name: "Elena Reyes",
      contact: "+63 917 555 0101",
      status: "confirmed",
      table: 1,
    },
    {
      id: 2,
      name: "Marco Dela Cruz",
      contact: "marco@email.com",
      status: "confirmed",
      table: 1,
    },
    {
      id: 3,
      name: "Liza Tan",
      contact: "+63 918 555 0202",
      status: "invited",
      table: null,
    },
    {
      id: 4,
      name: "Rico Almonte",
      contact: "",
      status: "declined",
      table: null,
    },
    {
      id: 5,
      name: "Jasmine Ong",
      contact: "+63 921 555 0303",
      status: "confirmed",
      table: 2,
    },
  ],
  2: [
    {
      id: 6,
      name: "Dir. Santos",
      contact: "dir@techcorp.com",
      status: "confirmed",
      table: null,
    },
    {
      id: 7,
      name: "Ana Morales",
      contact: "ana@techcorp.com",
      status: "invited",
      table: null,
    },
  ],
};

export const SEED_VENDORS: Record<number, Vendor[]> = {
  1: [
    {
      id: 1,
      name: "La Mesa Catering",
      category: "Catering",
      contact: "+63 912 888 0001",
      contract: "signed",
      amount: 125000,
      status: "active",
      notes: "",
    },
    {
      id: 2,
      name: "Lens & Love Photography",
      category: "Photography",
      contact: "lensandlove@gmail.com",
      contract: "signed",
      amount: 25000,
      status: "active",
      notes: "",
    },
    {
      id: 3,
      name: "Bloom & Co Flowers",
      category: "Flowers",
      contact: "+63 916 777 0002",
      contract: "pending",
      amount: 32000,
      status: "pending",
      notes: "Waiting for final deposit",
    },
  ],
  2: [
    {
      id: 4,
      name: "AV Masters CDO",
      category: "Sound & Lights",
      contact: "avmasters@cdomain.com",
      contract: "signed",
      amount: 28000,
      status: "active",
      notes: "",
    },
  ],
};

export const SEED_BUDGETS: Record<number, BudgetItem[]> = {
  1: [
    { id: 1, name: "Venue", budget: 80000, actual: 75000 },
    { id: 2, name: "Catering", budget: 120000, actual: 125000 },
    { id: 3, name: "Flowers & Decor", budget: 35000, actual: 32000 },
    { id: 4, name: "Photography", budget: 25000, actual: 25000 },
    { id: 5, name: "Sound & Lights", budget: 20000, actual: 18500 },
    { id: 6, name: "Wedding Cake", budget: 8000, actual: 7500 },
  ],
  2: [
    { id: 7, name: "Venue Rental", budget: 50000, actual: 48000 },
    { id: 8, name: "Catering", budget: 60000, actual: 62000 },
    { id: 9, name: "AV Equipment", budget: 30000, actual: 28000 },
  ],
};

export const SEED_FILES: Record<number, FileEntry[]> = {
  1: [
    { id: 1, name: "Venue_Contract.pdf", size: "2.3 MB", date: "2025-08-01" },
    { id: 2, name: "Catering_Quotation.docx", size: "145 KB", date: "2025-08-05" },
    { id: 3, name: "Guest_List_v2.xlsx", size: "88 KB", date: "2025-08-10" },
  ],
  2: [{ id: 4, name: "Summit_Agenda.pdf", size: "1.1 MB", date: "2025-09-01" }],
};

export const SEED_LOGS: Record<number, ActivityLogEntry[]> = {
  1: [
    { id: 1, text: "Event created", time: "Aug 1, 2025 · 9:00 AM" },
    { id: 2, text: "Added 5 guests to guest list", time: "Aug 5, 2025 · 2:30 PM" },
    { id: 3, text: "Updated catering budget item", time: "Aug 10, 2025 · 4:15 PM" },
  ],
  2: [],
};

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    text: 'Catering budget is 96% used for Santos–Cruz Wedding',
    color: "#facc15",
    time: "2 hours ago",
    read: false,
  },
  {
    id: 2,
    text: "3 guests haven't RSVPed for Santos–Cruz Wedding",
    color: "#60a5fa",
    time: "Yesterday",
    read: false,
  },
  {
    id: 3,
    text: 'Task "Confirm venue deposit" is overdue',
    color: "#f87171",
    time: "2 days ago",
    read: true,
  },
];

export function deepCloneSeed<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
