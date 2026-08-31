function collectTextMessages(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectTextMessages);
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap(collectTextMessages);
  }

  return [];
}

export function formatWarningMessages(
  warnings?: Record<string, unknown> | null,
): string[] {
  if (!warnings) {
    return [];
  }

  return Array.from(
    new Set(Object.values(warnings).flatMap(collectTextMessages)),
  );
}

export function formatBackendErrorDetails(errors: unknown): string | null {
  if (Array.isArray(errors)) {
    const graphQlMessages = errors.flatMap((error) => {
      if (
        typeof error !== "object" ||
        error === null ||
        !("message" in error)
      ) {
        return [];
      }

      return collectTextMessages(error.message);
    });

    if (graphQlMessages.length > 0) {
      return Array.from(new Set(graphQlMessages)).join("\n");
    }
  }

  const messages = Array.from(new Set(collectTextMessages(errors)));
  return messages.length > 0 ? messages.join("\n") : null;
}
