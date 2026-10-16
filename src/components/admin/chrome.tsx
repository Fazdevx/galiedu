"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";

export type BreadcrumbEntry = { area: string; page: string };

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return `${parts[0].charAt(0)}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

export function AppChrome({
  baseLabel,
  links,
  brand,
  userName,
  userRole,
  nav,
  signOut,
  actions,
  children,
}: {
  baseLabel: string;
  links: Record<string, BreadcrumbEntry>;
  brand: React.ReactNode;
  userName: string;
  userRole: string;
  nav: React.ReactNode;
  signOut: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const crumbs = resolveLink(links, pathname);

  useEffect(() => {
    if (!open) return;

    const closeBtn = drawerRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Cerrar menú"]');
    closeBtn?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const userFooter = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
        >
          {initialsOf(userName)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-gray-100">{userName}</p>
          <p className="truncate text-xs text-gray-400">{userRole}</p>
        </div>
      </div>
      {signOut}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 lg:sticky lg:top-0 lg:flex">
        <div className="border-b border-white/5">{brand}</div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          {nav}
        </nav>
        <div className="border-t border-white/5 px-4 py-4">{userFooter}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-gray-200/80 bg-white/85 px-4 backdrop-blur-md">
          <button
            onClick={() => setOpen(true)}
            className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-soft transition-colors hover:bg-gray-50 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="flex min-w-0 items-center text-sm" aria-label="Ruta actual">
            <span className="font-medium text-gray-400">{baseLabel}</span>
            {crumbs ? (
              <>
                <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-gray-300" />
                <Link
                  href={crumbs.href}
                  className="truncate font-semibold text-gray-900 transition-colors hover:text-primary"
                >
                  {crumbs.label}
                </Link>
              </>
            ) : null}
          </nav>

          {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
        </header>

        <main id="main-content" tabIndex={-1} className="focus:outline-none flex-1 p-4 md:p-6">
          <div key={pathname} className="animate-page-in">
            {children}
          </div>
        </main>
      </div>

      {open ? (
        <>
          <div
            className="animate-fade-in fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            className="animate-drawer-in fixed inset-y-0 left-0 z-50 flex w-72 flex-col rounded-r-2xl border-r border-white/5 bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 shadow-2xl lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="flex items-center justify-between border-b border-white/5 pr-2">
              {brand}
              <button
                onClick={() => setOpen(false)}
                className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
              {nav}
            </nav>
            <div className="border-t border-white/5 px-4 py-4">{userFooter}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function resolveLink(links: Record<string, BreadcrumbEntry>, pathname: string): { href: string; label: string } | null {
  let best: { href: string; label: string } | null = null;
  for (const [path, entry] of Object.entries(links)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      if (!best || path.length > best.href.length) {
        best = { href: path, label: entry.page };
      }
    }
  }
  return best;
}
