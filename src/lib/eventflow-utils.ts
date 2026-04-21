export function formatNumber(n: number | undefined): string {
  return (n ?? 0).toLocaleString("en-PH");
}

export function countdownTo(dateStr: string, now: Date) {
  const t = new Date(dateStr).getTime() - now.getTime();
  if (t < 0) {
    return [
      { val: 0, label: "days" },
      { val: 0, label: "hours" },
      { val: 0, label: "minutes" },
      { val: 0, label: "seconds" },
    ];
  }
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return [
    { val: d, label: "days" },
    { val: h, label: "hours" },
    { val: m, label: "min" },
    { val: s, label: "sec" },
  ];
}

export function barHeight(val: number, max: number): number {
  return max > 0 ? Math.max(4, Math.round((val / max) * 100)) : 4;
}

export function isOverdue(
  task: { done: boolean; dueDate?: string },
  todayIso: string,
): boolean {
  return !task.done && !!task.dueDate && task.dueDate < todayIso;
}

export function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export function fileEmoji(n: string): string {
  const e = n.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    jpg: "🖼",
    jpeg: "🖼",
    png: "🖼",
    mp4: "🎬",
    mp3: "🎵",
    zip: "📦",
  };
  return map[e] ?? "📎";
}

export function fileColor(n: string): string {
  const e = n.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(e)) return "#f87171";
  if (["doc", "docx"].includes(e)) return "#60a5fa";
  if (["xls", "xlsx"].includes(e)) return "#4ade80";
  if (["jpg", "jpeg", "png"].includes(e)) return "#a78bfa";
  return "#9998aa";
}
