"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";

const SHOW_DEMO_ACCOUNTS = process.env.NODE_ENV !== "production";

const DEMO_ACCOUNTS = SHOW_DEMO_ACCOUNTS
  ? [
      { email: "admin@galileo.edu.pe", password: "admin123", label: "Super admin" },
      { email: "director@galileo.edu.pe", password: "galileo123", label: "Director" },
      { email: "profesor@galileo.edu.pe", password: "galileo123", label: "Profesor" },
      { email: "apoderado@galileo.edu.pe", password: "apoderado123", label: "Apoderado" },
      { email: "alumno@galileo.edu.pe", password: "galileo123", label: "Alumno" },
    ]
  : [];

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);

    if (result?.error) {
      setError(
        result.code === "rate_limited"
          ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
          : "Correo o contraseña incorrectos.",
      );
      return;
    }

    router.push(result?.url ?? "/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@colegio.edu.pe"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <p
            className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200/80"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Ingresando…
            </>
          ) : (
            "Ingresar"
          )}
        </Button>

        <Link href="/recuperar" className="text-center text-sm text-gray-500 hover:text-gray-800">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>

      {SHOW_DEMO_ACCOUNTS ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3">
          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            Cuentas de demostración
            <span className="text-gray-400">{showDemo ? "Ocultar" : "Mostrar"}</span>
          </button>
          {showDemo ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                  }}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-soft transition-all hover:border-primary hover:bg-primary-soft hover:text-primary-strong active:scale-[0.97]"
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}