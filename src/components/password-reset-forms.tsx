"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { PASSWORD_HINT } from "@/lib/password";
import { requestPasswordReset, resetPassword, type AuthFormState } from "@/app/(auth)/actions";

const initial: AuthFormState = {};

function Message({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
        {state.success}
      </p>
    );
  }
  return null;
}

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" name="email" type="email" placeholder="correo@colegio.edu.pe" autoComplete="email" required />
      </div>

      <Message state={state} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
          </>
        ) : (
          "Enviar enlace"
        )}
      </Button>

      <Link href="/login" className="text-center text-sm text-gray-500 hover:text-gray-800">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, initial);

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <Message state={state} />
        <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
        <p className="text-xs text-gray-400">{PASSWORD_HINT}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>

      <Message state={state} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
          </>
        ) : (
          "Cambiar contraseña"
        )}
      </Button>
    </form>
  );
}
