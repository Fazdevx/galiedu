"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CornerDownLeft,
  GraduationCap,
  LayoutGrid,
  Loader2,
  ReceiptText,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  type: "student" | "user" | "course" | "academy" | "payment";
  title: string;
  subtitle?: string;
  href: string;
};

const TYPE_ICON = {
  student: GraduationCap,
  user: Users,
  course: BookOpen,
  academy: LayoutGrid,
  payment: ReceiptText,
} as const;

export const OPEN_SEARCH_EVENT = "galiedu:open-search";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const openPalette = useCallback(() => {
    setQuery("");
    setResults([]);
    setActive(0);
    setLoading(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, openPalette);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, openPalette);
    };
  }, [open, openPalette]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await res.json()) as { results?: Result[] };
        if (!cancelled) {
          setResults(data.results ?? []);
          setActive(0);
        }
      } catch {
        /* abortado o error de red */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      controller.abort();
    };
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) go(r.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda global"
        className="animate-pop-in relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-raised"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar alumnos, usuarios, cursos o recibos…"
            aria-label="Buscar"
            className="h-12 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" /> : null}
          <kbd className="hidden shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-sans text-[10px] text-gray-400 sm:block">
            Esc
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-xs text-gray-400">
              Escribe al menos 2 caracteres para buscar.
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-xs text-gray-400">
              Sin resultados para «{query.trim()}».
            </p>
          ) : (
            results.map((r, i) => {
              const Icon = TYPE_ICON[r.type];
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    i === active ? "bg-primary-soft text-primary-strong" : "hover:bg-gray-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      i === active ? "bg-white text-primary" : "bg-gray-100 text-gray-500",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{r.title}</span>
                    {r.subtitle ? (
                      <span className="block truncate text-xs text-gray-500">{r.subtitle}</span>
                    ) : null}
                  </span>
                  {i === active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}