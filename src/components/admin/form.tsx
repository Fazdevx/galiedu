"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { FormState } from "@/app/admin/_actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { useCanManage } from "@/components/admin/permissions";

export function Form({
  action,
  submitLabel,
  children,
  submitClassName,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
  submitClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const { toast } = useToast();
  const canManage = useCanManage();
  const notified = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pending) notified.current = false;
  }, [pending]);

  useEffect(() => {
    if (notified.current) return;
    if (state?.success) {
      notified.current = true;
      toast("success", state.success);
    } else if (state?.error) {
      notified.current = true;
      toast("error", state.error);
    }
  }, [state, toast]);

  useEffect(() => {
    if (pending || !canManage) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    if (el) el.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form action={formAction} ref={formRef} aria-busy={pending}>
      <fieldset disabled={pending || !canManage} className="contents">
        {children}

        {!canManage ? (
          <p className="mx-5 mb-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Solo los administradores pueden registrar o modificar esta sección.
          </p>
        ) : null}

        {state?.error ? (
          <p
            className="mx-5 mb-2 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        {canManage ? (
          <div className="p-5 pt-3">
            <Button type="submit" className={submitClassName} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}