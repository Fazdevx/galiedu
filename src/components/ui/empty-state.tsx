import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 py-12 text-center", className)}>
      {Icon ? (
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft/70 text-primary ring-1 ring-inset ring-primary-soft-strong/60">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {description ? <p className="max-w-sm text-xs leading-relaxed text-gray-400">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
