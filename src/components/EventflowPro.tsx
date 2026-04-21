"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEventHandler,
} from "react";
import type {
  ActivityLogEntry,
  AppView,
  AuthUser,
  BudgetItem,
  EventDetailTab,
  EventItem,
  EventTask,
  EventType,
  FileEntry,
  Guest,
  GuestStatus,
  Notification,
  TimelineItem,
  TimelineStatus,
  Vendor,
} from "@/lib/eventflow-types";

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
} from "@/lib/eventflow-seed";
import {
  barHeight,
  countdownTo,
  fileColor,
  fileEmoji,
  fmtSize,
  formatNumber,
  isOverdue,
} from "@/lib/eventflow-utils";
import type { WorkspacePayload } from "@/lib/workspace-payload";
import {
  addLogAction,
  createBudgetAction,
  createEventAction,
  createFileAction,
  createGuestAction,
  createTaskAction,
  createTimelineAction,
  createVendorAction,
  deleteBudgetAction,
  deleteEventAction,
  deleteFileAction,
  deleteGuestAction,
  deleteTaskAction,
  deleteTimelineAction,
  deleteVendorAction,
  getSessionAction,
  loadWorkspaceAction,
  loginAction,
  logoutAction,
  markAllNotificationsReadAction,
  markAllTimelineDoneAction,
  markNotificationReadAction,
  registerAction,
  updateBudgetAction,
  updateEventAction,
  updateGuestAction,
  updateGuestStatusAction,
  updateTaskAction,
  updateTimelineAction,
  updateVendorAction,
} from "@/app/actions/eventflow-actions";

/** Run async work from click handlers without leaving a floating Promise (avoids noisy dev overlay rejections). */
function fireAsync(fn: () => void | Promise<void>): () => void {
  return () => {
    void Promise.resolve(fn()).catch((err: unknown) => {
      console.error(err instanceof Error ? err : "Async action failed:", err);
    });
  };
}

function onEnterKey(fn: () => void | Promise<void>): KeyboardEventHandler {
  return (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void Promise.resolve(fn()).catch((err: unknown) => {
      console.error(err instanceof Error ? err : "Async action failed:", err);
    });
  };
}

function IconDash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function IconCal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconVendor() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function IconBudget() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text3)", flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

const USE_DB = process.env.NEXT_PUBLIC_USE_DATABASE === "true";

export default function EventflowPro() {
  const nextIdRef = useRef(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState({ email: "admin@eventflow.io", password: "password" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [authToast, setAuthToast] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [currentTab, setCurrentTab] = useState<EventDetailTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    USE_DB ? [] : deepCloneSeed(SEED_NOTIFICATIONS),
  );

  const [liveTime, setLiveTime] = useState("");
  const [tick, setTick] = useState(0);
  const [mountedDate, setMountedDate] = useState("");

  useEffect(() => {
    const upd = () => setLiveTime(new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    upd();
    const i = setInterval(() => {
      upd();
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    setMountedDate(
      new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  const [events, setEvents] = useState<EventItem[]>(() => (USE_DB ? [] : deepCloneSeed(SEED_EVENTS)));
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    type: "wedding" as EventType,
    date: "",
    location: "",
    notes: "",
  });

  const [tasks, setTasks] = useState<Record<number, EventTask[]>>(() => (USE_DB ? {} : deepCloneSeed(SEED_TASKS)));
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "done">("all");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    dueDate: "",
    priority: "medium" as EventTask["priority"],
    notes: "",
  });

  const [timelines, setTimelines] = useState<Record<number, TimelineItem[]>>(() =>
    USE_DB ? {} : deepCloneSeed(SEED_TIMELINES),
  );
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState<TimelineItem | null>(null);
  const [timelineForm, setTimelineForm] = useState({
    time: "",
    activity: "",
    notes: "",
    status: "pending" as TimelineStatus,
  });

  const [guests, setGuests] = useState<Record<number, Guest[]>>(() => (USE_DB ? {} : deepCloneSeed(SEED_GUESTS)));
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [guestForm, setGuestForm] = useState({
    name: "",
    contact: "",
    status: "invited" as GuestStatus,
    table: null as number | null,
  });

  const [vendors, setVendors] = useState<Record<number, Vendor[]>>(() => (USE_DB ? {} : deepCloneSeed(SEED_VENDORS)));
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    category: "Catering",
    contact: "",
    contract: "none" as Vendor["contract"],
    amount: 0,
    status: "pending" as Vendor["status"],
    notes: "",
  });

  const [budgets, setBudgets] = useState<Record<number, BudgetItem[]>>(() => (USE_DB ? {} : deepCloneSeed(SEED_BUDGETS)));
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [budgetForm, setBudgetForm] = useState({ name: "", budget: 0, actual: 0 });

  const [files, setFiles] = useState<Record<number, FileEntry[]>>(() => (USE_DB ? {} : deepCloneSeed(SEED_FILES)));
  const [dragging, setDragging] = useState(false);

  const [logs, setLogs] = useState<Record<number, ActivityLogEntry[]>>(() => (USE_DB ? {} : deepCloneSeed(SEED_LOGS)));

  const hydrateFromWorkspace = useCallback((w: WorkspacePayload | null | undefined) => {
    if (!w || !Array.isArray(w.events)) return;
    setEvents(w.events);
    setTasks(w.tasks ?? {});
    setTimelines(w.timelines ?? {});
    setGuests(w.guests ?? {});
    setVendors(w.vendors ?? {});
    setBudgets(w.budgets ?? {});
    setFiles(w.files ?? {});
    setLogs(w.logs ?? {});
    setNotifications(w.notifications ?? []);
    setSelectedEvent((se) => {
      if (!se) return null;
      return w.events.find((e) => e.id === se.id) ?? null;
    });
  }, []);

  useEffect(() => {
    if (!USE_DB) return;
    void (async () => {
      const { user } = await getSessionAction();
      if (!user) return;
      setAuthUser(user);
      const r = await loadWorkspaceAction();
      if (r.ok && r.workspace) hydrateFromWorkspace(r.workspace);
    })();
  }, [hydrateFromWorkspace]);

  const todayIso = useMemo(() => {
    void tick;
    return new Date().toISOString().split("T")[0];
  }, [tick]);

  const navigate = useCallback((v: AppView, t: EventDetailTab = "overview") => {
    setCurrentView(v);
    setCurrentTab(t);
  }, []);

  const topbarTitle = useMemo(() => {
    const m: Partial<Record<AppView, string>> = {
      dashboard: "Dashboard",
      events: "Events",
      analytics: "Analytics",
    };
    if (currentView === "event-detail" && selectedEvent) return selectedEvent.name;
    return m[currentView] ?? "";
  }, [currentView, selectedEvent]);

  const topbarBreadcrumb = useMemo(() => {
    if (currentView === "event-detail" && selectedEvent) return `Events / ${selectedEvent.name}`;
    return null;
  }, [currentView, selectedEvent]);

  const timeOfDay = (() => {
    void tick;
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  })();

  const unreadNotifs = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAllRead = useCallback(async () => {
    if (USE_DB) {
      const r = await markAllNotificationsReadAction();
      if (r.ok) hydrateFromWorkspace(r.workspace);
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    setShowNotifs(false);
  }, [hydrateFromWorkspace]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.type.includes(q),
    );
  }, [events, searchQuery]);

  const addLog = useCallback(
    async (text: string) => {
      const id = selectedEvent?.id;
      if (id == null) return;
      if (USE_DB) {
        const r = await addLogAction(id, text);
        if (r.ok) hydrateFromWorkspace(r.workspace);
        return;
      }
      setLogs((prev) => {
        const list = [...(prev[id] ?? [])];
        list.unshift({
          id: nextIdRef.current++,
          text,
          time: new Date().toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        });
        return { ...prev, [id]: list };
      });
    },
    [selectedEvent?.id, hydrateFromWorkspace],
  );

  const doLogin = async () => {
    if (!loginForm.email || !loginForm.password) return;
    if (USE_DB) {
      const r = await loginAction(loginForm.email, loginForm.password);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      if (!r.workspace) {
        alert("Could not load your workspace. Please try signing in again.");
        return;
      }
      setAuthUser(r.user);
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setAuthUser({ id: 1, name: "Maria Santos", email: loginForm.email });
  };

  const doRegister = async () => {
    if (!registerForm.name || !registerForm.email || !registerForm.password) return;
    const registeredEmail = registerForm.email.trim();
    if (USE_DB) {
      const r = await registerAction(registerForm.name, registeredEmail, registerForm.password);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      setRegisterForm({ name: "", email: "", password: "" });
      setLoginForm((f) => ({ ...f, email: registeredEmail, password: "" }));
      setAuthMode("login");
      setAuthToast(r.message);
      window.setTimeout(() => setAuthToast(null), 6000);
      return;
    }
    setRegisterForm({ name: "", email: "", password: "" });
    setLoginForm((f) => ({ ...f, email: registeredEmail, password: "" }));
    setAuthMode("login");
    setAuthToast("Registration successful. Please sign in with your email and password.");
    window.setTimeout(() => setAuthToast(null), 6000);
  };

  const doLogout = async () => {
    if (USE_DB) await logoutAction();
    setAuthUser(null);
    setSelectedEvent(null);
    setCurrentView("dashboard");
  };

  const openCreateEvent = () => {
    setEditingEvent(null);
    setEventForm({ name: "", type: "wedding", date: "", location: "", notes: "" });
    setShowEventModal(true);
  };

  const openEditEvent = (ev: EventItem) => {
    setEditingEvent(ev);
    setEventForm({
      name: ev.name,
      type: ev.type,
      date: ev.date,
      location: ev.location,
      notes: ev.notes,
    });
    setShowEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.name || !eventForm.date || !eventForm.location) return;
    if (USE_DB) {
      if (editingEvent) {
        const r = await updateEventAction(editingEvent.id, {
          name: eventForm.name,
          type: eventForm.type,
          date: eventForm.date,
          location: eventForm.location,
          notes: eventForm.notes,
        });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      } else {
        const r = await createEventAction({
          name: eventForm.name,
          type: eventForm.type,
          date: eventForm.date,
          location: eventForm.location,
          notes: eventForm.notes,
        });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      }
      setShowEventModal(false);
      return;
    }
    if (editingEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, ...eventForm } : e)),
      );
      setSelectedEvent((se) =>
        se && se.id === editingEvent.id ? { ...se, ...eventForm } : se,
      );
    } else {
      const newEv: EventItem = { id: nextIdRef.current++, ...eventForm };
      setEvents((prev) => [...prev, newEv]);
    }
    setShowEventModal(false);
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    if (USE_DB) {
      const r = await deleteEventAction(id);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      if (selectedEvent?.id === id) setCurrentView("events");
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelectedEvent((se) => {
      if (se?.id === id) {
        setCurrentView("events");
        return null;
      }
      return se;
    });
  };

  const selectEvent = (ev: EventItem) => {
    setSelectedEvent(ev);
    setCurrentView("event-detail");
    setCurrentTab("overview");
  };

  const upcomingEvent = useMemo(() => {
    void tick;
    const now = new Date();
    return (
      events
        .filter((e) => new Date(e.date) > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null
    );
  }, [events, tick]);

  const currentLog = useMemo(
    () => (selectedEvent ? logs[selectedEvent.id] ?? [] : []),
    [logs, selectedEvent],
  );

  const currentTasks = useMemo(
    () => (selectedEvent ? tasks[selectedEvent.id] ?? [] : []),
    [tasks, selectedEvent],
  );

  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") return currentTasks;
    if (taskFilter === "done") return currentTasks.filter((t) => t.done);
    return currentTasks.filter((t) => !t.done);
  }, [currentTasks, taskFilter]);

  const pendingTasksCount = useMemo(() => currentTasks.filter((t) => !t.done).length, [currentTasks]);

  const pendingTasksAll = useMemo(
    () => Object.values(tasks).reduce((s, l) => s + l.filter((t) => !t.done).length, 0),
    [tasks],
  );

  const allPendingTasks = useMemo(
    () =>
      events.flatMap((ev) =>
        (tasks[ev.id] ?? [])
          .filter((t) => !t.done)
          .map((t) => ({ ...t, eventName: ev.name, eventId: ev.id })),
      ),
    [events, tasks],
  );

  const overdueTasksCount = useMemo(
    () =>
      Object.values(tasks).reduce(
        (s, l) => s + l.filter((t) => !t.done && t.dueDate && t.dueDate < todayIso).length,
        0,
      ),
    [tasks, todayIso],
  );

  const openAddTask = () => {
    setTaskForm({ title: "", dueDate: "", priority: "medium", notes: "" });
    setShowTaskModal(true);
  };

  const saveTask = async () => {
    if (!taskForm.title || !selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await createTaskAction(id, {
        title: taskForm.title,
        dueDate: taskForm.dueDate || undefined,
        priority: taskForm.priority,
        notes: taskForm.notes,
      });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      setShowTaskModal(false);
      return;
    }
    setTasks((prev) => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { id: nextIdRef.current++, ...taskForm, done: false }],
    }));
    setShowTaskModal(false);
    void addLog(`Added task: ${taskForm.title}`);
  };

  const deleteTask = async (taskId: number) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await deleteTaskAction(id, taskId);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setTasks((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((t) => t.id !== taskId) }));
  };

  const toggleTask = async (task: EventTask) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await updateTaskAction(id, task.id, { done: !task.done });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      const r2 = await addLogAction(id, `${!task.done ? "Completed" : "Reopened"} task: ${task.title}`);
      if (r2.ok) hydrateFromWorkspace(r2.workspace);
      return;
    }
    setTasks((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
    }));
    void addLog(`${!task.done ? "Completed" : "Reopened"} task: ${task.title}`);
  };

  const eventTaskProgress = (eventId: number) => {
    const list = tasks[eventId] ?? [];
    const total = list.length;
    const done = list.filter((t) => t.done).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  const currentTimeline = useMemo(
    () => (selectedEvent ? timelines[selectedEvent.id] ?? [] : []),
    [timelines, selectedEvent],
  );

  const sortedTimeline = useMemo(
    () => [...currentTimeline].sort((a, b) => a.time.localeCompare(b.time)),
    [currentTimeline],
  );

  const openAddTimeline = () => {
    setEditingTimeline(null);
    setTimelineForm({ time: "", activity: "", notes: "", status: "pending" });
    setShowTimelineModal(true);
  };

  const openEditTimeline = (item: TimelineItem) => {
    setEditingTimeline(item);
    setTimelineForm({ ...item });
    setShowTimelineModal(true);
  };

  const saveTimeline = async () => {
    if (!timelineForm.time || !timelineForm.activity || !selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      if (editingTimeline) {
        const r = await updateTimelineAction(id, editingTimeline.id, { ...timelineForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      } else {
        const r = await createTimelineAction(id, { ...timelineForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      }
      setShowTimelineModal(false);
      return;
    }
    if (editingTimeline) {
      setTimelines((prev) => ({
        ...prev,
        [id]: (prev[id] ?? []).map((t) => (t.id === editingTimeline.id ? { ...t, ...timelineForm } : t)),
      }));
    } else {
      setTimelines((prev) => ({
        ...prev,
        [id]: [...(prev[id] ?? []), { id: nextIdRef.current++, ...timelineForm }],
      }));
    }
    setShowTimelineModal(false);
  };

  const deleteTimeline = async (tid: number) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await deleteTimelineAction(id, tid);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setTimelines((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((t) => t.id !== tid) }));
  };

  const markAllDone = async () => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await markAllTimelineDoneAction(id);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setTimelines((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).map((t) => ({ ...t, status: "done" as TimelineStatus })),
    }));
    void addLog("Marked all timeline items as done");
  };

  const currentGuests = useMemo(
    () => (selectedEvent ? guests[selectedEvent.id] ?? [] : []),
    [guests, selectedEvent],
  );

  const totalGuestsAll = useMemo(
    () => Object.values(guests).reduce((s, l) => s + l.length, 0),
    [guests],
  );

  const totalConfirmedAll = useMemo(
    () => Object.values(guests).reduce((s, l) => s + l.filter((g) => g.status === "confirmed").length, 0),
    [guests],
  );

  const openAddGuest = () => {
    setEditingGuest(null);
    setGuestForm({ name: "", contact: "", status: "invited", table: null });
    setShowGuestModal(true);
  };

  const openEditGuest = (g: Guest) => {
    setEditingGuest(g);
    setGuestForm({ name: g.name, contact: g.contact, status: g.status, table: g.table });
    setShowGuestModal(true);
  };

  const saveGuest = async () => {
    if (!guestForm.name || !selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      if (editingGuest) {
        const r = await updateGuestAction(id, editingGuest.id, { ...guestForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      } else {
        const r = await createGuestAction(id, { ...guestForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      }
      setShowGuestModal(false);
      const r2 = await addLogAction(id, `${editingGuest ? "Updated" : "Added"} guest: ${guestForm.name}`);
      if (r2.ok) hydrateFromWorkspace(r2.workspace);
      return;
    }
    if (editingGuest) {
      setGuests((prev) => ({
        ...prev,
        [id]: (prev[id] ?? []).map((g) => (g.id === editingGuest.id ? { ...g, ...guestForm } : g)),
      }));
    } else {
      setGuests((prev) => ({
        ...prev,
        [id]: [...(prev[id] ?? []), { id: nextIdRef.current++, ...guestForm }],
      }));
    }
    setShowGuestModal(false);
    void addLog(`${editingGuest ? "Updated" : "Added"} guest: ${guestForm.name}`);
  };

  const deleteGuest = async (gid: number) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await deleteGuestAction(id, gid);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setGuests((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((g) => g.id !== gid) }));
  };

  const guestStats = useMemo(
    () => [
      { label: "Confirmed", count: totalConfirmedAll, color: "var(--green)" },
      {
        label: "Invited (pending)",
        count: Object.values(guests).reduce((s, l) => s + l.filter((g) => g.status === "invited").length, 0),
        color: "var(--yellow)",
      },
      {
        label: "Declined",
        count: Object.values(guests).reduce((s, l) => s + l.filter((g) => g.status === "declined").length, 0),
        color: "var(--red)",
      },
    ],
    [guests, totalConfirmedAll],
  );

  const currentVendors = useMemo(
    () => (selectedEvent ? vendors[selectedEvent.id] ?? [] : []),
    [vendors, selectedEvent],
  );

  const openAddVendor = () => {
    setEditingVendor(null);
    setVendorForm({
      name: "",
      category: "Catering",
      contact: "",
      contract: "none",
      amount: 0,
      status: "pending",
      notes: "",
    });
    setShowVendorModal(true);
  };

  const openEditVendor = (v: Vendor) => {
    setEditingVendor(v);
    setVendorForm({
      name: v.name,
      category: v.category,
      contact: v.contact,
      contract: v.contract,
      amount: v.amount,
      status: v.status,
      notes: v.notes,
    });
    setShowVendorModal(true);
  };

  const saveVendor = async () => {
    if (!vendorForm.name || !selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      if (editingVendor) {
        const r = await updateVendorAction(id, editingVendor.id, { ...vendorForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      } else {
        const r = await createVendorAction(id, { ...vendorForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      }
      setShowVendorModal(false);
      const r2 = await addLogAction(id, `${editingVendor ? "Updated" : "Added"} vendor: ${vendorForm.name}`);
      if (r2.ok) hydrateFromWorkspace(r2.workspace);
      return;
    }
    if (editingVendor) {
      setVendors((prev) => ({
        ...prev,
        [id]: (prev[id] ?? []).map((v) => (v.id === editingVendor.id ? { ...v, ...vendorForm } : v)),
      }));
    } else {
      setVendors((prev) => ({
        ...prev,
        [id]: [...(prev[id] ?? []), { id: nextIdRef.current++, ...vendorForm }],
      }));
    }
    setShowVendorModal(false);
    void addLog(`${editingVendor ? "Updated" : "Added"} vendor: ${vendorForm.name}`);
  };

  const deleteVendor = async (vid: number) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await deleteVendorAction(id, vid);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setVendors((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((v) => v.id !== vid) }));
  };

  const currentBudget = useMemo(
    () => (selectedEvent ? budgets[selectedEvent.id] ?? [] : []),
    [budgets, selectedEvent],
  );

  const totalBudget = useMemo(() => currentBudget.reduce((s, i) => s + (i.budget || 0), 0), [currentBudget]);
  const totalActual = useMemo(() => currentBudget.reduce((s, i) => s + (i.actual || 0), 0), [currentBudget]);
  const budgetVariance = totalActual - totalBudget;

  const totalBudgetAll = useMemo(
    () => Object.values(budgets).reduce((s, l) => s + l.reduce((ss, i) => ss + (i.budget || 0), 0), 0),
    [budgets],
  );

  const totalActualAll = useMemo(
    () => Object.values(budgets).reduce((s, l) => s + l.reduce((ss, i) => ss + (i.actual || 0), 0), 0),
    [budgets],
  );

  const totalBudgetForEvent = (eid: number) =>
    (budgets[eid] ?? []).reduce((s, i) => s + (i.budget || 0), 0);
  const totalActualForEvent = (eid: number) =>
    (budgets[eid] ?? []).reduce((s, i) => s + (i.actual || 0), 0);

  const maxBudgetAll = useMemo(() => {
    return Math.max(
      ...events.map((e) => {
        const list = budgets[e.id] ?? [];
        const tb = list.reduce((s, i) => s + (i.budget || 0), 0);
        const ta = list.reduce((s, i) => s + (i.actual || 0), 0);
        return Math.max(tb, ta);
      }),
      1,
    );
  }, [events, budgets]);

  const updateTimelineStatus = async (itemId: number, status: TimelineStatus) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await updateTimelineAction(id, itemId, { status });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setTimelines((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).map((t) => (t.id === itemId ? { ...t, status } : t)),
    }));
  };

  const openAddBudget = () => {
    setEditingBudget(null);
    setBudgetForm({ name: "", budget: 0, actual: 0 });
    setShowBudgetModal(true);
  };

  const openEditBudget = (item: BudgetItem) => {
    setEditingBudget(item);
    setBudgetForm({ name: item.name, budget: item.budget, actual: item.actual });
    setShowBudgetModal(true);
  };

  const saveBudget = async () => {
    if (!budgetForm.name || !selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      if (editingBudget) {
        const r = await updateBudgetAction(id, editingBudget.id, { ...budgetForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      } else {
        const r = await createBudgetAction(id, { ...budgetForm });
        if (!r.ok) {
          alert(r.error);
          return;
        }
        hydrateFromWorkspace(r.workspace);
      }
      setShowBudgetModal(false);
      return;
    }
    if (editingBudget) {
      setBudgets((prev) => ({
        ...prev,
        [id]: (prev[id] ?? []).map((b) => (b.id === editingBudget.id ? { ...b, ...budgetForm } : b)),
      }));
    } else {
      setBudgets((prev) => ({
        ...prev,
        [id]: [...(prev[id] ?? []), { id: nextIdRef.current++, ...budgetForm }],
      }));
    }
    setShowBudgetModal(false);
  };

  const deleteBudget = async (bid: number) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await deleteBudgetAction(id, bid);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setBudgets((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((b) => b.id !== bid) }));
  };

  const budgetAlerts = useMemo(() => {
    const alerts: string[] = [];
    Object.entries(budgets).forEach(([evId, list]) => {
      const ev = events.find((e) => e.id === Number(evId));
      if (!ev) return;
      list.forEach((item) => {
        if (item.budget > 0 && item.actual / item.budget >= 0.9 && item.actual <= item.budget) {
          alerts.push(`"${item.name}" for ${ev.name} is ${Math.round((item.actual / item.budget) * 100)}% of budget`);
        }
      });
    });
    return alerts.slice(0, 2);
  }, [budgets, events]);

  const currentFiles = useMemo(
    () => (selectedEvent ? files[selectedEvent.id] ?? [] : []),
    [files, selectedEvent],
  );

  const triggerFileInput = () => fileInputRef.current?.click();

  const addFileEntry = async (f: File) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await createFileAction(id, {
        name: f.name,
        size: fmtSize(f.size),
        date: new Date().toISOString().split("T")[0],
      });
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setFiles((prev) => ({
      ...prev,
      [id]: [
        ...(prev[id] ?? []),
        {
          id: nextIdRef.current++,
          name: f.name,
          size: fmtSize(f.size),
          date: new Date().toISOString().split("T")[0],
        },
      ],
    }));
    void addLog(`Uploaded file: ${f.name}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    for (const f of Array.from(e.dataTransfer.files)) {
      void addFileEntry(f).catch((err: unknown) => {
        console.error(err instanceof Error ? err : "Upload failed:", err);
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (fl) {
      for (const f of Array.from(fl)) {
        void addFileEntry(f).catch((err: unknown) => {
          console.error(err instanceof Error ? err : "Upload failed:", err);
        });
      }
    }
    e.target.value = "";
  };

  const deleteFile = async (fid: number) => {
    if (!selectedEvent) return;
    const id = selectedEvent.id;
    if (USE_DB) {
      const r = await deleteFileAction(id, fid);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      hydrateFromWorkspace(r.workspace);
      return;
    }
    setFiles((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((f) => f.id !== fid) }));
  };

  const avgGuests = useMemo(
    () => (events.length ? Math.round(totalGuestsAll / events.length) : 0),
    [events.length, totalGuestsAll],
  );

  const budgetEfficiency = useMemo(() => {
    if (!totalBudgetAll) return 0;
    const saved = totalBudgetAll - totalActualAll;
    return Math.max(0, Math.round((saved / totalBudgetAll) * 100));
  }, [totalBudgetAll, totalActualAll]);

  const taskCompletionRate = useMemo(() => {
    const all = Object.values(tasks).flat();
    return all.length ? Math.round((all.filter((t) => t.done).length / all.length) * 100) : 0;
  }, [tasks]);

  const eventsByType = useMemo(() => {
    const types: EventType[] = ["wedding", "birthday", "corporate", "other"];
    const colors: Record<EventType, string> = {
      wedding: "var(--purple)",
      birthday: "var(--orange)",
      corporate: "var(--blue)",
      other: "var(--text2)",
    };
    return types
      .map((t) => ({
        type: t,
        count: events.filter((e) => e.type === t).length,
        color: colors[t],
      }))
      .filter((t) => t.count > 0);
  }, [events]);

  const cd = upcomingEvent ? countdownTo(upcomingEvent.date, new Date()) : [];

  if (!authUser) {
    return (
      <div id="app">
        {authToast && (
          <div className="auth-toast" role="status" aria-live="polite">
            <span className="auth-toast-icon" aria-hidden="true">
              ✓
            </span>
            <span>{authToast}</span>
          </div>
        )}
        <div className="auth-wrap">
          <div className="auth-bg" />
          <div className="auth-card">
            <div className="auth-logo">✦ Eventflow Pro</div>
            <div className="auth-tagline">Professional event command center</div>
            <div className="auth-tabs">
              <button type="button" className={`auth-tab${authMode === "login" ? " active" : ""}`} onClick={() => setAuthMode("login")}>
                Sign In
              </button>
              <button type="button" className={`auth-tab${authMode === "register" ? " active" : ""}`} onClick={() => setAuthMode("register")}>
                Register
              </button>
            </div>
            {authMode === "login" ? (
              <>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="admin@eventflow.io"
                    onKeyDown={onEnterKey(() => doLogin())}
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    onKeyDown={onEnterKey(() => doLogin())}
                  />
                </div>
                <button type="button" className="btn btn-primary btn-full" style={{ marginTop: 6 }} onClick={fireAsync(doLogin)}>
                  Sign In →
                </button>
                <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 14 }}>
                  Demo: admin@eventflow.io / password
                </p>
              </>
            ) : (
              <>
                <div className="field">
                  <label>Full Name</label>
                  <input
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Maria Santos"
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                    onKeyDown={onEnterKey(() => doRegister())}
                    placeholder="••••••••"
                  />
                </div>
                <button type="button" className="btn btn-primary btn-full" style={{ marginTop: 6 }} onClick={fireAsync(doRegister)}>
                  Create Account →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={`sidebar-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">✦ Eventflow Pro</div>
          <div className="sidebar-sub">Event Management</div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">Main</div>
          <div
            className={`nav-item${currentView === "dashboard" ? " active" : ""}`}
            onClick={() => {
              navigate("dashboard");
              setSidebarOpen(false);
            }}
          >
            <IconDash />
            Dashboard
          </div>
          <div
            className={`nav-item${currentView === "events" ? " active" : ""}`}
            onClick={() => {
              navigate("events");
              setSidebarOpen(false);
            }}
          >
            <IconCal />
            Events
            {events.length > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 99,
                  fontWeight: 700,
                }}
              >
                {events.length}
              </span>
            )}
          </div>
          <div
            className={`nav-item${currentView === "analytics" ? " active" : ""}`}
            onClick={() => {
              navigate("analytics");
              setSidebarOpen(false);
            }}
          >
            <IconChart />
            Analytics
          </div>

          {selectedEvent && (
            <>
              <div className="sidebar-section" style={{ marginTop: 6 }}>
                Current Event
              </div>
              <div
                style={{
                  padding: "7px 10px 8px",
                  background: "var(--accent-dim2)",
                  borderRadius: "var(--r)",
                  border: "1px solid rgba(200,169,110,.15)",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--accent)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedEvent.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>{selectedEvent.date}</div>
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "overview" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "overview");
                  setSidebarOpen(false);
                }}
              >
                <IconInfo />
                Overview
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "tasks" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "tasks");
                  setSidebarOpen(false);
                }}
              >
                <IconCheck />
                Tasks
                {pendingTasksCount > 0 && (
                  <span className="badge-num" style={{ marginLeft: "auto" }}>
                    {pendingTasksCount}
                  </span>
                )}
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "timeline" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "timeline");
                  setSidebarOpen(false);
                }}
              >
                <IconArrow />
                Timeline
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "guests" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "guests");
                  setSidebarOpen(false);
                }}
              >
                <IconUsers />
                Guests
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "vendors" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "vendors");
                  setSidebarOpen(false);
                }}
              >
                <IconVendor />
                Vendors
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "budget" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "budget");
                  setSidebarOpen(false);
                }}
              >
                <IconBudget />
                Budget
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "runsheet" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "runsheet");
                  setSidebarOpen(false);
                }}
              >
                <IconClock />
                Runsheet
              </div>
              <div
                className={`nav-item${currentView === "event-detail" && currentTab === "files" ? " active" : ""}`}
                onClick={() => {
                  navigate("event-detail", "files");
                  setSidebarOpen(false);
                }}
              >
                <IconFile />
                Files
              </div>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">{authUser.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="user-name">{authUser.name}</div>
              <div className="user-role">Event Manager</div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: "auto" }} title="Logout" onClick={fireAsync(doLogout)}>
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button type="button" className="menu-btn" onClick={() => setSidebarOpen((o) => !o)}>
              <IconMenu />
            </button>
            <div>
              <div className="topbar-title">{topbarTitle}</div>
              {topbarBreadcrumb && <div className="topbar-breadcrumb">{topbarBreadcrumb}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {currentView !== "event-detail" && (
              <div className="search-bar">
                <IconSearch />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search events…" />
              </div>
            )}
            <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ position: "relative" }} onClick={() => setShowNotifs((s) => !s)}>
              <IconBell />
              {unreadNotifs > 0 && (
                <span className="badge-num" style={{ position: "absolute", top: -3, right: -3 }}>
                  {unreadNotifs}
                </span>
              )}
            </button>
            {currentView === "events" && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreateEvent}>
                <IconPlus />
                New Event
              </button>
            )}
          </div>
        </div>

        {showNotifs && (
          <div className="notif-panel">
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Notifications</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={fireAsync(markAllRead)}>
                Mark all read
              </button>
            </div>
            {notifications.map((n) => (
              <div
                key={n.id}
                className="notif-item"
                onClick={fireAsync(async () => {
                  if (USE_DB) {
                    const r = await markNotificationReadAction(n.id, true);
                    if (r.ok) hydrateFromWorkspace(r.workspace);
                    return;
                  }
                  setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                })}
              >
                <div className="notif-dot" style={{ background: n.color, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{n.time}</div>
                </div>
                {!n.read && (
                  <div className="notif-dot" style={{ background: "var(--blue)", marginLeft: "auto", flexShrink: 0, marginTop: 5 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="content" onClick={() => setShowNotifs(false)}>
          {currentView === "dashboard" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "var(--font-d)", fontSize: 26, color: "var(--text)", marginBottom: 4 }}>
                  Good {timeOfDay}, {authUser.name.split(" ")[0]} ✦
                </div>
                <div style={{ color: "var(--text3)", fontSize: 13 }}>{mountedDate || "…"}</div>
              </div>
              {(budgetAlerts.length > 0 || overdueTasksCount > 0) && (
                <>
                  {budgetAlerts.map((a) => (
                    <div key={a} className="alert alert-warn">
                      ⚠ {a}
                    </div>
                  ))}
                  {overdueTasksCount > 0 && (
                    <div className="alert alert-danger">
                      ⚑ {overdueTasksCount} overdue task{overdueTasksCount > 1 ? "s" : ""} across your events
                    </div>
                  )}
                </>
              )}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Events</div>
                  <div className="stat-value text-accent">{events.length}</div>
                  <div className="stat-sub">All time</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Confirmed Guests</div>
                  <div className="stat-value">{totalConfirmedAll}</div>
                  <div className="stat-sub">of {totalGuestsAll} total</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Open Tasks</div>
                  <div className={`stat-value${overdueTasksCount ? " text-red" : " text-accent"}`}>{pendingTasksAll}</div>
                  <div className="stat-sub">{overdueTasksCount} overdue</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Spent</div>
                  <div className="stat-value">₱{formatNumber(totalActualAll)}</div>
                  <div className="stat-sub">of ₱{formatNumber(totalBudgetAll)} budgeted</div>
                </div>
              </div>
              {upcomingEvent && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header">
                    <div className="card-title">⏳ Next Event Countdown</div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => selectEvent(upcomingEvent)}>
                      Open →
                    </button>
                  </div>
                  <div className="card-body">
                    <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{upcomingEvent.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>{upcomingEvent.location}</div>
                    <div className="countdown-grid">
                      {cd.map((c) => (
                        <div key={c.label} className="cd-item">
                          <div className="cd-num">{c.val}</div>
                          <div className="cd-label">{c.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Recent Events</div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate("events")}>
                      All →
                    </button>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    {events.slice(0, 4).map((ev) => (
                      <div
                        key={ev.id}
                        className="nav-item"
                        style={{ borderRadius: 0, margin: 0, padding: "12px 18px" }}
                        onClick={() => selectEvent(ev)}
                      >
                        <span className={`event-type-badge badge-${ev.type}`} style={{ margin: 0 }}>
                          {ev.type.charAt(0).toUpperCase()}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{ev.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Pending Tasks (All Events)</div>
                  </div>
                  <div className="card-body" style={{ padding: 0 }}>
                    {allPendingTasks.length > 0 ? (
                      allPendingTasks.slice(0, 5).map((t) => (
                        <div key={`${t.eventId}-${t.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderBottom: "1px solid var(--border)" }}>
                          <div
                            className={`task-check${t.done ? " checked" : ""}`}
                            onClick={fireAsync(async () => {
                              if (USE_DB) {
                                const r = await updateTaskAction(t.eventId, t.id, { done: !t.done });
                                if (r.ok) hydrateFromWorkspace(r.workspace);
                                return;
                              }
                              const ev = events.find((e) => e.name === t.eventName);
                              if (!ev) return;
                              setTasks((prev) => ({
                                ...prev,
                                [ev.id]: (prev[ev.id] ?? []).map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                              }));
                            })}
                            style={{ flexShrink: 0 }}
                          >
                            {t.done && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>
                              {t.eventName} · {t.dueDate || "No due date"}
                            </div>
                          </div>
                          <span className={`status priority-${t.priority}`}>{t.priority}</span>
                        </div>
                      ))
                    ) : (
                      <div className="empty" style={{ padding: "30px 20px" }}>
                        <div className="empty-text" style={{ fontSize: 13 }}>
                          All caught up!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {currentView === "events" && (
            <>
              {searchQuery && (
                <div style={{ marginBottom: 14, fontSize: 13, color: "var(--text2)" }}>
                  {filteredEvents.length} result{filteredEvents.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                </div>
              )}
              {filteredEvents.length === 0 ? (
                <div className="empty" style={{ paddingTop: 70 }}>
                  <div className="empty-icon">🗓</div>
                  <div className="empty-text">{searchQuery ? "No events found" : "No events yet"}</div>
                  <div className="empty-sub">{searchQuery ? "Try a different search" : "Create your first event to get started"}</div>
                  {!searchQuery && (
                    <button type="button" className="btn btn-primary" onClick={openCreateEvent}>
                      + New Event
                    </button>
                  )}
                </div>
              ) : (
                <div className="events-grid">
                  {filteredEvents.map((ev) => {
                    const prog = eventTaskProgress(ev.id);
                    return (
                      <div key={ev.id} className="event-card">
                        <span className={`event-type-badge badge-${ev.type}`}>{ev.type}</span>
                        <div className="event-name">{ev.name}</div>
                        <div className="event-meta">
                          <IconCal /> {ev.date}
                        </div>
                        <div className="event-meta">
                          <IconPin /> {ev.location}
                        </div>
                        {prog.total > 0 && (
                          <div className="event-progress">
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>
                              <span>Tasks</span>
                              <span>
                                {prog.done}/{prog.total}
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${prog.pct}%`, background: "var(--green)" }} />
                            </div>
                          </div>
                        )}
                        <div className="event-actions">
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => selectEvent(ev)}>
                            Open →
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditEvent(ev)}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={fireAsync(() => deleteEvent(ev.id))}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {currentView === "analytics" && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Events</div>
                  <div className="stat-value text-accent">{events.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Guests/Event</div>
                  <div className="stat-value">{avgGuests}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Budget Efficiency</div>
                  <div className="stat-value text-green">{budgetEfficiency}%</div>
                  <div className="stat-sub">under budget</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Task Completion</div>
                  <div className="stat-value">{taskCompletionRate}%</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Budget vs Actual (per event)</div>
                  </div>
                  <div className="card-body">
                    <div className="bar-chart" style={{ height: 180, alignItems: "flex-end", gap: 12 }}>
                      {events.map((ev) => (
                        <div key={ev.id} className="bar-group" style={{ flex: 1 }}>
                          <div className="bar-wrap" style={{ height: 150, alignItems: "flex-end", gap: 2 }}>
                            <div
                              className="bar"
                              style={{
                                height: `${barHeight(totalBudgetForEvent(ev.id), maxBudgetAll)}%`,
                                background: "var(--accent)",
                                opacity: 0.7,
                              }}
                              data-tip={`Budget: ₱${formatNumber(totalBudgetForEvent(ev.id))}`}
                            />
                            <div
                              className="bar"
                              style={{
                                height: `${barHeight(totalActualForEvent(ev.id), maxBudgetAll)}%`,
                                background: totalActualForEvent(ev.id) > totalBudgetForEvent(ev.id) ? "var(--red)" : "var(--green)",
                              }}
                              data-tip={`Actual: ₱${formatNumber(totalActualForEvent(ev.id))}`}
                            />
                          </div>
                          <div className="bar-label">{ev.name.split(" ")[0]}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)", opacity: 0.7, display: "inline-block" }} />
                        Budget
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--green)", display: "inline-block" }} />
                        Actual
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Guest RSVP Status</div>
                  </div>
                  <div className="card-body">
                    {totalGuestsAll === 0 ? (
                      <div className="empty" style={{ padding: 20 }}>
                        <div className="empty-sub">No guest data yet</div>
                      </div>
                    ) : (
                      guestStats.map((s) => (
                        <div key={s.label} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "var(--text2)" }}>{s.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                              {s.count}{" "}
                              <span style={{ color: "var(--text3)", fontWeight: 400 }}>({Math.round((s.count / totalGuestsAll) * 100)}%)</span>
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${Math.round((s.count / totalGuestsAll) * 100)}%`, background: s.color }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Events by Type</div>
                </div>
                <div className="card-body">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12 }}>
                    {eventsByType.map((t) => (
                      <div
                        key={t.type}
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r)",
                          padding: 14,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 22, fontFamily: "var(--font-d)", color: t.color }}>{t.count}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "capitalize", marginTop: 2 }}>{t.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {currentView === "event-detail" && selectedEvent && (
            <>
              <div className="tabs">
                {(
                  [
                    ["overview", "Overview"],
                    ["tasks", `Tasks${pendingTasksCount ? ` (${pendingTasksCount})` : ""}`],
                    ["timeline", "Timeline"],
                    ["guests", "Guests"],
                    ["vendors", "Vendors"],
                    ["budget", "Budget"],
                    ["runsheet", "Runsheet"],
                    ["files", "Files"],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    className={`tab${currentTab === tab ? " active" : ""}`}
                    onClick={() => setCurrentTab(tab as EventDetailTab)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {currentTab === "overview" && (
                <>
                  <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                    <div className="stat-card">
                      <div className="stat-label">Guests</div>
                      <div className="stat-value">{currentGuests.length}</div>
                      <div className="stat-sub">{currentGuests.filter((g) => g.status === "confirmed").length} confirmed</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Tasks Done</div>
                      <div className="stat-value text-accent">
                        {currentTasks.filter((t) => t.done).length}/{currentTasks.length || 0}
                      </div>
                      <div className="stat-sub">
                        {Math.round((currentTasks.filter((t) => t.done).length / Math.max(currentTasks.length, 1)) * 100)}% complete
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Budget</div>
                      <div className={`stat-value${budgetVariance <= 0 ? " text-green" : " text-red"}`}>{budgetVariance <= 0 ? "On Track" : "Over"}</div>
                      <div className="stat-sub">
                        ₱{formatNumber(Math.abs(budgetVariance))} {budgetVariance <= 0 ? "saved" : "over"}
                      </div>
                    </div>
                  </div>
                  <div className="overview-grid">
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">Event Details</div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditEvent(selectedEvent)}>
                          Edit
                        </button>
                      </div>
                      <div className="card-body">
                        <div className="info-row">
                          <span className="info-key">Name</span>
                          <span className="info-val">{selectedEvent.name}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-key">Type</span>
                          <span className="info-val">
                            <span className={`event-type-badge badge-${selectedEvent.type}`} style={{ fontSize: 10 }}>
                              {selectedEvent.type}
                            </span>
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-key">Date</span>
                          <span className="info-val">{selectedEvent.date}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-key">Location</span>
                          <span className="info-val">{selectedEvent.location}</span>
                        </div>
                        {selectedEvent.notes && (
                          <div className="info-row">
                            <span className="info-key">Notes</span>
                            <span className="info-val" style={{ maxWidth: 200 }}>
                              {selectedEvent.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <div className="card-title">Activity Log</div>
                      </div>
                      <div className="card-body" style={{ padding: 0, maxHeight: 240, overflowY: "auto" }}>
                        {currentLog.map((log) => (
                          <div key={log.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} />
                            <div>
                              <div style={{ fontSize: 12, color: "var(--text)" }}>{log.text}</div>
                              <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>{log.time}</div>
                            </div>
                          </div>
                        ))}
                        {currentLog.length === 0 && (
                          <div className="empty" style={{ padding: 20 }}>
                            <div className="empty-sub">No activity yet</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {currentTab === "tasks" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(["all", "pending", "done"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={
                            taskFilter === f
                              ? { borderColor: "var(--accent)", color: "var(--accent)" }
                              : undefined
                          }
                          onClick={() => setTaskFilter(f)}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
                          {f === "all"
                            ? `(${currentTasks.length})`
                            : f === "done"
                              ? `(${currentTasks.filter((t) => t.done).length})`
                              : `(${currentTasks.filter((t) => !t.done).length})`}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAddTask}>
                      <IconPlus />
                      Add Task
                    </button>
                  </div>
                  {currentTasks.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 5 }}>
                        <span>Progress</span>
                        <span>
                          {currentTasks.filter((t) => t.done).length} of {currentTasks.length} done
                        </span>
                      </div>
                      <div className="progress-bar" style={{ height: 7 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.round((currentTasks.filter((t) => t.done).length / currentTasks.length) * 100)}%`,
                            background: "var(--green)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {filteredTasks.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">✓</div>
                      <div className="empty-text">No tasks here</div>
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div key={task.id} className={`task-item${task.done ? " done-task" : ""}`}>
                        <div className={`task-check${task.done ? " checked" : ""}`} onClick={fireAsync(() => toggleTask(task))}>
                          {task.done && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={`task-title${task.done ? " done-text" : ""}`}>{task.title}</div>
                          <div className="task-meta">
                            {task.dueDate && (
                              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <IconCal />
                                <span style={isOverdue(task, todayIso) ? { color: "var(--red)" } : undefined}>{task.dueDate}</span>
                              </span>
                            )}
                            {task.notes && <span style={{ color: "var(--text3)" }}>{task.notes}</span>}
                          </div>
                        </div>
                        <span className={`status priority-${task.priority}`}>{task.priority}</span>
                        <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={fireAsync(() => deleteTask(task.id))}>
                          <IconTrash />
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}

              {currentTab === "timeline" && (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAddTimeline}>
                      <IconPlus />
                      Add Item
                    </button>
                  </div>
                  {sortedTimeline.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">⏱</div>
                      <div className="empty-text">No timeline items</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Activity</th>
                            <th>Notes</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTimeline.map((item) => (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>{item.time}</td>
                              <td style={{ fontWeight: 500 }}>{item.activity}</td>
                              <td style={{ color: "var(--text3)", maxWidth: 180 }}>{item.notes || "—"}</td>
                              <td>
                                <select
                                  className={`status status-${item.status}`}
                                  value={item.status}
                                  onChange={(e) => updateTimelineStatus(item.id, e.target.value as TimelineStatus)}
                                  style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--font-b)" }}
                                >
                                  <option value="pending">pending</option>
                                  <option value="ongoing">ongoing</option>
                                  <option value="done">done</option>
                                </select>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 5 }}>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditTimeline(item)}>
                                    Edit
                                  </button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={fireAsync(() => deleteTimeline(item.id))}>
                                    Del
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {currentTab === "guests" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { label: "Total", count: currentGuests.length },
                        {
                          label: "Confirmed",
                          count: currentGuests.filter((g) => g.status === "confirmed").length,
                          color: "var(--green)",
                        },
                        {
                          label: "Pending",
                          count: currentGuests.filter((g) => g.status === "invited").length,
                          color: "var(--yellow)",
                        },
                        {
                          label: "Declined",
                          count: currentGuests.filter((g) => g.status === "declined").length,
                          color: "var(--red)",
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          style={{
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--r)",
                            padding: "10px 14px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 18,
                              fontFamily: "var(--font-d)",
                              ...(row.color ? { color: row.color } : {}),
                            }}
                          >
                            {row.count}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{row.label}</div>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAddGuest}>
                      + Add Guest
                    </button>
                  </div>
                  {currentGuests.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">👥</div>
                      <div className="empty-text">No guests yet</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Contact</th>
                            <th>Table</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentGuests.map((g) => (
                            <tr key={g.id}>
                              <td style={{ fontWeight: 500 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      background: "var(--surface3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "var(--text2)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {g.name.charAt(0).toUpperCase()}
                                  </div>
                                  {g.name}
                                </div>
                              </td>
                              <td style={{ color: "var(--text3)" }}>{g.contact || "—"}</td>
                              <td style={{ color: "var(--text3)" }}>{g.table ? `Table ${g.table}` : "—"}</td>
                              <td>
                                <select
                                  className={`status status-${g.status}`}
                                  value={g.status}
                                  onChange={async (e) => {
                                    const v = e.target.value as GuestStatus;
                                    const id = selectedEvent.id;
                                    if (USE_DB) {
                                      const r = await updateGuestStatusAction(id, g.id, v);
                                      if (r.ok) hydrateFromWorkspace(r.workspace);
                                      return;
                                    }
                                    setGuests((prev) => ({
                                      ...prev,
                                      [id]: (prev[id] ?? []).map((x) => (x.id === g.id ? { ...x, status: v } : x)),
                                    }));
                                  }}
                                  style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--font-b)" }}
                                >
                                  <option value="invited">invited</option>
                                  <option value="confirmed">confirmed</option>
                                  <option value="declined">declined</option>
                                </select>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 5 }}>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditGuest(g)}>
                                    Edit
                                  </button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={fireAsync(() => deleteGuest(g.id))}>
                                    Del
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {currentTab === "vendors" && (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAddVendor}>
                      + Add Vendor
                    </button>
                  </div>
                  {currentVendors.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">🏪</div>
                      <div className="empty-text">No vendors yet</div>
                      <div className="empty-sub">Add caterers, photographers, venues and more</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Category</th>
                            <th>Contact</th>
                            <th>Contract</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentVendors.map((v) => (
                            <tr key={v.id}>
                              <td style={{ fontWeight: 500 }}>{v.name}</td>
                              <td>
                                <span className="vendor-category">{v.category}</span>
                              </td>
                              <td style={{ color: "var(--text3)" }}>{v.contact || "—"}</td>
                              <td>
                                <select
                                  value={v.contract}
                                  onChange={async (e) => {
                                    const id = selectedEvent.id;
                                    const val = e.target.value as Vendor["contract"];
                                    if (USE_DB) {
                                      const r = await updateVendorAction(id, v.id, { contract: val });
                                      if (r.ok) hydrateFromWorkspace(r.workspace);
                                      return;
                                    }
                                    setVendors((prev) => ({
                                      ...prev,
                                      [id]: (prev[id] ?? []).map((x) => (x.id === v.id ? { ...x, contract: val } : x)),
                                    }));
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    fontSize: 11,
                                    color: "var(--text2)",
                                    cursor: "pointer",
                                    outline: "none",
                                    fontFamily: "var(--font-b)",
                                  }}
                                >
                                  <option value="none">No contract</option>
                                  <option value="signed">Signed</option>
                                  <option value="pending">Pending</option>
                                </select>
                              </td>
                              <td>₱{formatNumber(v.amount || 0)}</td>
                              <td>
                                <select
                                  className={`status vendor-status-${v.status}`}
                                  value={v.status}
                                  onChange={async (e) => {
                                    const id = selectedEvent.id;
                                    const val = e.target.value as Vendor["status"];
                                    if (USE_DB) {
                                      const r = await updateVendorAction(id, v.id, { status: val });
                                      if (r.ok) hydrateFromWorkspace(r.workspace);
                                      return;
                                    }
                                    setVendors((prev) => ({
                                      ...prev,
                                      [id]: (prev[id] ?? []).map((x) => (x.id === v.id ? { ...x, status: val } : x)),
                                    }));
                                  }}
                                  style={{ border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--font-b)" }}
                                >
                                  <option value="pending">pending</option>
                                  <option value="active">active</option>
                                  <option value="cancelled">cancelled</option>
                                </select>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: 5 }}>
                                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditVendor(v)}>
                                    Edit
                                  </button>
                                  <button type="button" className="btn btn-danger btn-sm" onClick={fireAsync(() => deleteVendor(v.id))}>
                                    Del
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {currentTab === "budget" && (
                <>
                  <div className="budget-summary">
                    <div className="budget-card">
                      <div className="budget-label">Total Budget</div>
                      <div className="budget-val text-accent">₱{formatNumber(totalBudget)}</div>
                    </div>
                    <div className="budget-card">
                      <div className="budget-label">Total Actual</div>
                      <div className="budget-val">₱{formatNumber(totalActual)}</div>
                    </div>
                    <div className="budget-card">
                      <div className="budget-label">Variance</div>
                      <div className={`budget-val${budgetVariance <= 0 ? " text-green" : " text-red"}`}>
                        {budgetVariance <= 0 ? "▼ Saved" : "▲ Over"} ₱{formatNumber(Math.abs(budgetVariance))}
                      </div>
                    </div>
                  </div>
                  {totalBudget > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 5 }}>
                        <span>Budget utilization</span>
                        <span>{Math.round((totalActual / totalBudget) * 100)}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 7 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, Math.round((totalActual / totalBudget) * 100))}%`,
                            background: totalActual > totalBudget ? "var(--red)" : "var(--green)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAddBudget}>
                      + Add Item
                    </button>
                  </div>
                  {currentBudget.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">💰</div>
                      <div className="empty-text">No budget items</div>
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Budget</th>
                            <th>Actual</th>
                            <th>Difference</th>
                            <th>% Used</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentBudget.map((item) => {
                            const diff = item.budget - item.actual;
                            const pct = item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 0;
                            return (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 500 }}>{item.name}</td>
                                <td>₱{formatNumber(item.budget)}</td>
                                <td>₱{formatNumber(item.actual)}</td>
                                <td className={diff >= 0 ? "text-green" : "text-red"}>
                                  {diff >= 0 ? "▼" : "▲"} ₱{formatNumber(Math.abs(diff))}
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 60 }}>
                                      <div className="progress-bar">
                                        <div
                                          className="progress-fill"
                                          style={{
                                            width: `${Math.min(100, pct)}%`,
                                            background: item.actual > item.budget ? "var(--red)" : "var(--accent)",
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <span style={{ fontSize: 11, color: "var(--text3)", minWidth: 28, textAlign: "right" }}>{pct}%</span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: "flex", gap: 5 }}>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditBudget(item)}>
                                      Edit
                                    </button>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={fireAsync(() => deleteBudget(item.id))}>
                                      Del
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {currentTab === "runsheet" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Day-of Program</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>Live runsheet for on-site execution</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--accent)",
                          borderRadius: "var(--r)",
                          padding: "8px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--accent)",
                        }}
                      >
                        {liveTime}
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={fireAsync(markAllDone)}>
                        Mark All Done
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text3)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
                      {currentTimeline.filter((t) => t.status === "done").length} Done
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text3)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", display: "inline-block" }} />
                      {currentTimeline.filter((t) => t.status === "ongoing").length} Ongoing
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text3)" }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--border2)",
                          display: "inline-block",
                          border: "2px solid var(--border2)",
                        }}
                      />
                      {currentTimeline.filter((t) => t.status === "pending").length} Pending
                    </div>
                  </div>
                  {sortedTimeline.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">📋</div>
                      <div className="empty-text">No timeline items</div>
                      <div className="empty-sub">Add items in the Timeline tab first</div>
                    </div>
                  ) : (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--rlg)", padding: "18px 20px" }}>
                      {sortedTimeline.map((item, i) => (
                        <div key={item.id} className="runsheet-item" style={{ position: "relative" }}>
                          {i < sortedTimeline.length - 1 && <div className="runsheet-line" />}
                          <div className="runsheet-time">{item.time}</div>
                          <div className={`runsheet-dot ${item.status}`} style={{ marginTop: 3, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                              <div>
                                <div className="runsheet-activity">{item.activity}</div>
                                {item.notes && <div className="runsheet-notes">{item.notes}</div>}
                              </div>
                              <div style={{ display: "flex", gap: 5 }}>
                                {item.status !== "done" ? (
                                  <button
                                    type="button"
                                    className="btn btn-success btn-sm"
                                    onClick={fireAsync(async () => {
                                      const next = item.status === "pending" ? "ongoing" : "done";
                                      if (!selectedEvent) return;
                                      if (USE_DB) {
                                        const r = await updateTimelineAction(selectedEvent.id, item.id, { status: next });
                                        if (!r.ok) {
                                          alert(r.error);
                                          return;
                                        }
                                        hydrateFromWorkspace(r.workspace);
                                        const r2 = await addLogAction(selectedEvent.id, `Marked "${item.activity}" as ${next}`);
                                        if (r2.ok) hydrateFromWorkspace(r2.workspace);
                                        return;
                                      }
                                      void updateTimelineStatus(item.id, next);
                                      void addLog(`Marked "${item.activity}" as ${next}`);
                                    })}
                                  >
                                    {item.status === "pending" ? "Start" : "Done ✓"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={fireAsync(async () => {
                                      if (!selectedEvent) return;
                                      if (USE_DB) {
                                        const r = await updateTimelineAction(selectedEvent.id, item.id, { status: "pending" });
                                        if (r.ok) hydrateFromWorkspace(r.workspace);
                                        return;
                                      }
                                      void updateTimelineStatus(item.id, "pending");
                                    })}
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {currentTab === "files" && (
                <>
                  <div
                    className={`upload-zone${dragging ? " dragging" : ""}`}
                    style={{ marginBottom: 18 }}
                    onClick={triggerFileInput}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div style={{ fontSize: 26, marginBottom: 8, opacity: 0.5 }}>📎</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)", marginBottom: 3 }}>Click or drag & drop to upload</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>PDF, images, documents — any type</div>
                  </div>
                  <input ref={fileInputRef} type="file" style={{ display: "none" }} multiple onChange={handleFileSelect} />
                  {currentFiles.length === 0 ? (
                    <div className="empty" style={{ padding: "28px 20px" }}>
                      <div className="empty-text">No files uploaded yet</div>
                    </div>
                  ) : (
                    currentFiles.map((file) => (
                      <div key={file.id} className="file-item">
                        <div className="file-icon" style={{ background: `${fileColor(file.name)}20`, color: fileColor(file.name) }}>
                          {fileEmoji(file.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>
                            {file.size} · {file.date}
                          </div>
                        </div>
                        <button type="button" className="btn btn-ghost btn-sm">
                          Download
                        </button>
                        <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={fireAsync(() => deleteFile(file.id))}>
                          <IconTrash />
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {showEventModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEventModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingEvent ? "Edit Event" : "New Event"}</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowEventModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Event Name *</label>
                <input value={eventForm.name} onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Santos–Cruz Wedding" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Type</label>
                  <select value={eventForm.type} onChange={(e) => setEventForm((f) => ({ ...f, type: e.target.value as EventType }))}>
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="corporate">Corporate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Date *</label>
                  <input type="date" value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Location *</label>
                <input value={eventForm.location} onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Ballroom, Cotabato City" />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={eventForm.notes} onChange={(e) => setEventForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any special notes…" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowEventModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={fireAsync(saveEvent)}>
                {editingEvent ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTaskModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">Add Task</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowTaskModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Task Title *</label>
                <input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Confirm catering menu" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Due Date</label>
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value as EventTask["priority"] }))}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <input value={taskForm.notes} onChange={(e) => setTaskForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={fireAsync(saveTask)}>
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimelineModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTimelineModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingTimeline ? "Edit Item" : "Add Timeline Item"}</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowTimelineModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Time *</label>
                  <input type="time" value={timelineForm.time} onChange={(e) => setTimelineForm((f) => ({ ...f, time: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={timelineForm.status} onChange={(e) => setTimelineForm((f) => ({ ...f, status: e.target.value as TimelineStatus }))}>
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Activity *</label>
                <input value={timelineForm.activity} onChange={(e) => setTimelineForm((f) => ({ ...f, activity: e.target.value }))} placeholder="e.g. Guest arrival" />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={timelineForm.notes} onChange={(e) => setTimelineForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowTimelineModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={fireAsync(saveTimeline)}>
                {editingTimeline ? "Save" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuestModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowGuestModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingGuest ? "Edit Guest" : "Add Guest"}</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowGuestModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Full Name *</label>
                <input value={guestForm.name} onChange={(e) => setGuestForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Jose Reyes" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Contact</label>
                  <input value={guestForm.contact} onChange={(e) => setGuestForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Phone or email" />
                </div>
                <div className="field">
                  <label>Table #</label>
                  <input
                    type="number"
                    value={guestForm.table ?? ""}
                    onChange={(e) =>
                      setGuestForm((f) => ({
                        ...f,
                        table: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    placeholder="e.g. 5"
                    min={1}
                  />
                </div>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={guestForm.status} onChange={(e) => setGuestForm((f) => ({ ...f, status: e.target.value as GuestStatus }))}>
                  <option value="invited">Invited</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowGuestModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={fireAsync(saveGuest)}>
                {editingGuest ? "Save" : "Add Guest"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVendorModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowVendorModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingVendor ? "Edit Vendor" : "Add Vendor"}</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowVendorModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Vendor Name *</label>
                <input value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Bloom & Co Flowers" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Category</label>
                  <select value={vendorForm.category} onChange={(e) => setVendorForm((f) => ({ ...f, category: e.target.value }))}>
                    <option>Catering</option>
                    <option>Photography</option>
                    <option>Videography</option>
                    <option>Flowers</option>
                    <option>Venue</option>
                    <option>Sound & Lights</option>
                    <option>Entertainment</option>
                    <option>Transport</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={vendorForm.status} onChange={(e) => setVendorForm((f) => ({ ...f, status: e.target.value as Vendor["status"] }))}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Contact</label>
                  <input value={vendorForm.contact} onChange={(e) => setVendorForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Phone or email" />
                </div>
                <div className="field">
                  <label>Amount (₱)</label>
                  <input
                    type="number"
                    value={vendorForm.amount || ""}
                    onChange={(e) => setVendorForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="field">
                <label>Contract</label>
                <select value={vendorForm.contract} onChange={(e) => setVendorForm((f) => ({ ...f, contract: e.target.value as Vendor["contract"] }))}>
                  <option value="none">No contract</option>
                  <option value="pending">Pending signature</option>
                  <option value="signed">Signed</option>
                </select>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={vendorForm.notes} onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowVendorModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={fireAsync(saveVendor)}>
                {editingVendor ? "Save" : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBudgetModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowBudgetModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingBudget ? "Edit Budget Item" : "Add Budget Item"}</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowBudgetModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Item Name *</label>
                <input value={budgetForm.name} onChange={(e) => setBudgetForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Catering, Venue, Flowers" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Budget (₱)</label>
                  <input type="number" value={budgetForm.budget || ""} onChange={(e) => setBudgetForm((f) => ({ ...f, budget: Number(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div className="field">
                  <label>Actual (₱)</label>
                  <input type="number" value={budgetForm.actual || ""} onChange={(e) => setBudgetForm((f) => ({ ...f, actual: Number(e.target.value) || 0 }))} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowBudgetModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={fireAsync(saveBudget)}>
                {editingBudget ? "Save" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
