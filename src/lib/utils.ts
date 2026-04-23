import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  if (!date) return 'N/A';
  if (date.toDate) return date.toDate().toLocaleDateString('fr-FR');
  if (date instanceof Date) return date.toLocaleDateString('fr-FR');
  return String(date);
}
