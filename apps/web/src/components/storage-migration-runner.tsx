"use client";

import { useEffect } from "react";
import { migrateStorageKeys } from "@/lib/storage-migration";

/**
 * Invisible client component that runs the one-time storage key migration.
 * Remove after ~4 weeks (May 2026) along with storage-migration.ts.
 */
export function StorageMigrationRunner() {
  useEffect(() => {
    migrateStorageKeys();
  }, []);

  return null;
}
