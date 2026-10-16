"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { useCanManage } from "@/components/admin/permissions";

type ActionResult = { error?: string; success?: string } | void;
type ServerAction = (formData: FormData) => ActionResult | Promise<ActionResult>;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmReject({
  action,
  fields,
  title = "¿Rechazar solicitud?",
  description = "El motivo será visible para quien la solicitó.",
  confirmLabel = "Rechazar",
  cancelLabel = "Cancelar",
  className,
  children,
}: {
  action: ServerAction;
  fields: Record<string, string>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const canManage = useCanManage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPending(false);
    setReason("");
    lastFocused.current?.focus?.();
    lastFocused.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;

    lastFocused.current = (document.activeElement as HTMLElement) ?? null;
    dialogRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!canManage) return null;

  const dialog = (
    <div className="animate-fade-in fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="animate-pop-in relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-raised outline-none"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
      >
        <form
          action={async (formData) => {
            if (reason.trim().length < 3) {
              toast("error", "Indica un motivo de rechazo (mínimo 3 caracteres).");
              return;
            }
            setPending(true);
            try {
              const result = await action(formData);
              if (result && result.error) {
                toast("error", result.error);
              } else {
                toast("success", "Solicitud rechazada");
              }
            } catch {
              toast("error", "No se pudo completar la acción.");
            } finally {
              close();
            }
          }}
        >
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <div className="mb-4">
            <h2 id={`${id}-title`} className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            <p id={`${id}-desc`} className="mt-0.5 text-sm text-gray-500">
              {description}
            </p>
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <label htmlFor={`${id}-reason`} className="text-sm font-medium text-gray-700">
              Motivo del rechazo
            </label>
            <Input
              id={`${id}-reason`}
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={300}
              placeholder="Ej. Rol incorrecto, datos incompletos…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Rechazando…
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className={cn("inline-flex", className)}>
      <div onClick={() => setOpen(true)} className="contents">
        {children}
      </div>
      {open ? createPortal(dialog, document.body) : null}
    </div>
  );
}
