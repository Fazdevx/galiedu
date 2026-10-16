"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortalNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Navegación del portal">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.href === "/portal" ? Home : GraduationCap;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-white shadow-sm shadow-primary/25"
                : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}