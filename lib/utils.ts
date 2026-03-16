import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp like Facebook Messenger:
 * - Just now (< 1 minute)
 * - X minutes ago (< 1 hour)
 * - Time only (today, e.g., "10:19 AM")
 * - "Yesterday" (yesterday)
 * - Day name (last 7 days, e.g., "Monday")
 * - Full date (older, e.g., "Feb 27")
 */
export function formatMessageTime(
  dateInput: string | Date | undefined,
): string {
  if (!dateInput) return "";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  // Check if date is valid
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Just now (< 1 minute)
  if (diffMins < 1) {
    return "now";
  }

  // X minutes ago (< 1 hour)
  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  // Today - show time only
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  // Last 7 days - show day name
  if (diffDays < 7) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  }

  // Older - show date
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function formatPresenceStatus(
  isOnline?: boolean,
  lastSeen?: string | Date,
  lastSeenText?: string,
): string {
  if (lastSeenText && lastSeenText.trim().length > 0) {
    return lastSeenText;
  }

  if (isOnline) {
    return "Đang hoạt động";
  }

  if (!lastSeen) {
    return "Vừa truy cập";
  }

  const date = typeof lastSeen === "string" ? new Date(lastSeen) : lastSeen;
  if (Number.isNaN(date.getTime())) {
    return "Vừa truy cập";
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa truy cập";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
