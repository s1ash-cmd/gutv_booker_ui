import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onClick" | "role"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed",
        checked && !disabled
          ? "bg-primary"
          : checked
            ? "bg-muted-foreground/35"
            : "bg-secondary",
        disabled && !checked && "opacity-50",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "size-4 rounded-full shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
          checked && !disabled ? "bg-white" : "bg-muted-foreground",
        )}
      />
    </button>
  );
}
