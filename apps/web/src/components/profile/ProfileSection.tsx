import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** A titled group of rows, styled like a settings list. */
export function ProfileSection({
  title,
  footer,
  children,
}: {
  title: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">{children}</ul>
        {footer && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}

function RowBody({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value?: ReactNode;
}) {
  return (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-[18px] shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-[17px]"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{label}</p>
        {value && (
          <p className="truncate text-xs text-muted-foreground">{value}</p>
        )}
      </div>
    </>
  );
}

export function ProfileRow({
  icon,
  label,
  value,
  action,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <RowBody icon={icon} label={label} value={value} />
      {action}
    </li>
  );
}

export function ProfileLinkRow({
  href,
  icon,
  label,
  value,
  meta,
}: {
  href: string;
  icon?: ReactNode;
  label: ReactNode;
  value?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <RowBody icon={icon} label={label} value={value} />
        {meta}
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Link>
    </li>
  );
}

/** Muted single-line state (loading, empty) inside a ProfileSection. */
export function ProfileNote({ children }: { children: ReactNode }) {
  return (
    <li className="px-4 py-4 text-sm text-muted-foreground">{children}</li>
  );
}
