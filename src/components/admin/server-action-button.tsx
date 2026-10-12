"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { useCanManage } from "@/components/admin/permissions";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg" | "icon";

export function ServerActionButton({
  action,
  fields,
  children,
  success = "Listo",
  variant = "outline",
  size = "sm",
  className,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  fields: Record<string, string>;
  children: React.ReactNode;
  success?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const canManage = useCanManage();

  if (!canManage) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={() => {
        const formData = new FormData();
        for (const [key, value] of Object.entries(fields)) formData.set(key, value);
        startTransition(async () => {
          const res = await action(formData);
          if (res && res.error) {
            toast("error", res.error);
            return;
          }
          toast("success", success);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : children}
    </Button>
  );
}