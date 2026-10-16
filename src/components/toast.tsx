"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

const ToastContext = createContext<{
  toast: (type: Toast["type"], message: string) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TONE = {
  success: {
    wrap: "border-emerald-200/80",
    iconWrap: "bg-emerald-100 text-emerald-600",
    bar: "bg-emerald-500",
    Icon: CheckCircle2,
  },
  error: {
    wrap: "border-red-200/80",
    iconWrap: "bg-red-100 text-red-600",
    bar: "bg-red-500",
    Icon: AlertCircle,
  },
  info: {
    wrap: "border-gray-200",
    iconWrap: "bg-gray-100 text-gray-500",
    bar: "bg-gray-400",
    Icon: Info,
  },
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: Toast["type"], message: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => {
          const tone = TONE[t.type];
          const Icon = tone.Icon;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "animate-toast-in pointer-events-auto overflow-hidden rounded-xl border bg-white px-3.5 py-3 text-sm font-medium text-gray-800 shadow-raised",
                tone.wrap,
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", tone.iconWrap)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="leading-snug">{t.message}</span>
              </div>
              <div className="mt-2.5 h-0.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={cn("animate-toast-progress h-full rounded-full", tone.bar)} />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
