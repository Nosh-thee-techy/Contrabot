import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
        CB
      </div>
      {showText && <span className="text-lg font-semibold text-ink">ContraBot</span>}
    </div>
  );
}
