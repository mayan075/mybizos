"use client";

import { useApiQuery, useApiMutation } from "./use-api";

interface Notification {
  id: string;
  orgId: string;
  userId: string | null;
  type: string;
  title: string;
  description: string | null;
  read: boolean;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function useNotifications(options: { type?: string; unread?: boolean } = {}) {
  const params: Record<string, string> = {};
  if (options.type) params.type = options.type;
  if (options.unread) params.unread = "true";

  return useApiQuery<Notification[]>(
    "/orgs/:orgId/notifications",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

function useMarkNotificationRead(id: string) {
  return useApiMutation<void, Notification>(
    `/orgs/:orgId/notifications/${id}/read`,
    "patch",
  );
}

function useMarkAllRead() {
  return useApiMutation<void, { message: string }>(
    "/orgs/:orgId/notifications/read-all",
    "post",
  );
}

function useDismissNotification(id: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/notifications/${id}`,
    "delete",
  );
}

export { useNotifications, useMarkNotificationRead, useMarkAllRead, useDismissNotification };
export type { Notification };
