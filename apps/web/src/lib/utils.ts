import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: "bg-red-50 text-red-700 border-red-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    low: "bg-blue-50 text-blue-700 border-blue-200",
    informational: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return map[severity] || map.informational;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    ingesting: "bg-blue-50 text-blue-700",
    analyzing: "bg-primary/10 text-primary",
    consensus: "bg-yellow-50 text-yellow-700",
    done: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
  };
  return map[status] || map.pending;
}
