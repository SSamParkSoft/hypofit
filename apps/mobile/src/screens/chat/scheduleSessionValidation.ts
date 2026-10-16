export type ScheduleMeetingType = "online" | "offline";

export function getAllowedMeetingTypes(mode: string | null | undefined): ScheduleMeetingType[] {
  if (mode === "online" || mode === "offline") return [mode];
  if (mode === "both") return ["online", "offline"];
  return [];
}

export function formatScheduleDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatScheduleTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function buildScheduledAt(dateValue: string, timeValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  // Date normalizes impossible calendar dates and 24:00 instead of rejecting them.
  if (
    date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day ||
    date.getHours() !== hour || date.getMinutes() !== minute
  ) {
    return null;
  }

  return date.toISOString();
}
