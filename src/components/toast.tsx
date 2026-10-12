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
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-lg",
              t.type === "success" && "border-green-200 text-green-800",
              t.type === "error" && "border-red-200 text-red-800",
              t.type === "info" && "border-gray-200 text-gray-800",
            )}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : t.type === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            )}
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}