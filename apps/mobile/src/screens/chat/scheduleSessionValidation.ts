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
