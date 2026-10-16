import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-gray-200/80 bg-white shadow-card", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold tracking-tight text-gray-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-gray-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center border-t border-gray-100 bg-gray-50/60 px-5 py-3", className)}
      {...props}
    />
  );
}

export function Badge({
  children,
  className,
  tone = "gray",
}: {
  children: ReactNode;
  className?: string;
  tone?: "gray" | "green" | "red" | "blue" | "amber" | "primary";
}) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/80",
    red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/80",
    blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/80",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/80",
    primary: "bg-primary-soft text-primary-strong ring-1 ring-inset ring-primary-soft-strong",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium text-gray-700", className)}>
      {children}
    </label>
  );
}
