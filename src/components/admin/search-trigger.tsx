"use client";

import { Search } from "lucide-react";
import { OPEN_SEARCH_EVENT } from "@/components/admin/command-palette";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs text-gray-500 transition-all hover:border-gray-300 hover:bg-white hover:text-gray-700"
      aria-label="Buscar (Ctrl + K)"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Buscar…</span>
      <kbd className="hidden rounded border border-gray-200 bg-white px-1 font-sans text-[10px] text-gray-400 md:inline">
        Ctrl K
      </kbd>
    </button>
  );
}