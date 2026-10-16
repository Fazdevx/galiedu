"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-raised">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Algo salió mal</h1>
        <p className="text-sm text-gray-500">
          Ocurrió un error inesperado al cargar esta sección. Puedes intentarlo de nuevo.
        </p>
        <div className="mt-2 flex gap-2">
          <Button type="button" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reintentar
          </Button>
          <Link href="/">
            <Button type="button" variant="outline">
              <Home className="h-4 w-4" /> Ir al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}