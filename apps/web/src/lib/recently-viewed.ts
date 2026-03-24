/**
 * Recently Viewed tracker — persists last N pages visited to localStorage.
 * Used by the command palette for quick access and the dashboard for a "Recently Viewed" section.
 */

const STORAGE_KEY = "mybizos_recently_viewed";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  /** URL path, e.g. "/dashboard/contacts/c1" */
  path: string;
  /** Human-readable label, e.g. "Sarah Johnson" */
  label: string;
  /** Type category for display, e.g. "Contact", "Deal", "Invoice" */
  type: "Contact" | "Deal" | "Invoice" | "Appointment" | "Page";
  /** Timestamp of last visit */
  visitedAt: number;
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: RecentlyViewedItem[] = JSON.parse(raw);
    return items.sort((a, b) => b.visitedAt - a.visitedAt).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function trackPageVisit(item: Omit<RecentlyViewedItem, "visitedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewed();
    // Remove duplicate if present
    const filtered = existing.filter((i) => i.path !== item.path);
    // Add to front
    const updated: RecentlyViewedItem[] = [
      { ...item, visitedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export function getRecentContacts(limit: number = 5): RecentlyViewedItem[] {
  return getRecentlyViewed()
    .filter((i) => i.type === "Contact")
    .slice(0, limit);
}
