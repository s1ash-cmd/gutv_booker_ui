/** Adds a `from` query parameter so the target page can link back here. */
export function withFrom(href: string, from: string) {
  return `${href}?from=${encodeURIComponent(from)}`;
}

/** Returns a same-site path from the `from` query parameter, or null. */
export function readFrom(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function backLabelFor(path: string) {
  if (path.startsWith("/dashboard/bookings/")) return "Назад к бронированию";
  return "Назад";
}

/**
 * Returns to the referring page through history so the referrer's own back
 * button keeps working; falls back to a push when the page was opened fresh.
 */
export function goBack(
  router: { back: () => void; push: (href: string) => void },
  from: string | null,
  fallback: string,
) {
  if (from && window.history.length > 1) router.back();
  else router.push(from ?? fallback);
}
