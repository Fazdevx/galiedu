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
    <div className={cn("flex flex-col items-center justify-center gap-1 py-10 text-center", className)}>
      {Icon ? (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description ? <p className="max-w-sm text-xs text-gray-400">{description}</p> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}