import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const controlBase =
  "flex w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 shadow-soft transition-all placeholder:text-gray-400 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlBase, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(controlBase, "min-h-16 py-2", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        controlBase,
        "h-9 cursor-pointer appearance-none bg-no-repeat pr-8",
        className,
      )}
      style={{
        backgroundImage: CHEVRON,
        backgroundPosition: "right 0.55rem center",
        backgroundSize: "1rem",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
