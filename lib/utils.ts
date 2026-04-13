import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp in Vietnamese style for conversation list.
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
    return "vừa xong";
  }

  // X minutes ago (< 1 hour)
  if (diffMins < 60) {
    return `${diffMins} phút`;
  }

  // Today - show time only
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Hôm qua";
  }

  // Last 7 days - show day name
  if (diffDays < 7) {
    const days = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
    return days[date.getDay()];
  }

  // Older - show date
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
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

/**
 * Format timestamp for posts
 * Today: HH:mm
 * Yesterday: HH:mm hôm qua
 * Older: DD/MM/YYYY HH:mm
 */
export function formatPostTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  
  const timeString = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return timeString;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `${timeString} hôm qua`;
  }

  const dateString = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  
  return `${dateString} ${timeString}`;
}
