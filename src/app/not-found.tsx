import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Compass className="h-6 w-6" />
        </div>
        <p className="text-4xl font-bold tracking-tight text-gray-900">404</p>
        <h1 className="text-lg font-semibold text-gray-900">No encontramos esta página</h1>
        <p className="text-sm text-gray-500">
          El enlace puede estar roto o el recurso ya no existe.
        </p>
        <div className="mt-2">
          <Link href="/">
            <Button type="button">
              <Home className="h-4 w-4" /> Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}