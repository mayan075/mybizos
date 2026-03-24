"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

const ToastContext = createContext<ToastContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  Single toast component                                                     */
/* -------------------------------------------------------------------------- */

function ToastMessage({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, onDismiss]);

  const Icon =
    item.type === "success"
      ? CheckCircle2
      : item.type === "error"
        ? AlertCircle
        : Info;

  const bgColor =
    item.type === "success"
      ? "bg-emerald-600"
      : item.type === "error"
        ? "bg-destructive"
        : "bg-blue-600";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg",
        "animate-in fade-in slide-in-from-top-2 duration-200",
        bgColor,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-white/20 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const success = useCallback(
    (message: string) => addToast(message, "success"),
    [addToast],
  );

  const error = useCallback(
    (message: string) => addToast(message, "error"),
    [addToast],
  );

  const info = useCallback(
    (message: string) => addToast(message, "info"),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {/* Toast container — fixed top-right */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-auto">
          {toasts.map((t) => (
            <ToastMessage key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast };
export type { ToastType, ToastContextValue };
