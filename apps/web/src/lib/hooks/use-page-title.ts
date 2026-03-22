import { useEffect } from "react";

/**
 * Sets `document.title` for client-side pages.
 * Uses the root layout's `%s | MyBizOS` pattern.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | MyBizOS`;
  }, [title]);
}
