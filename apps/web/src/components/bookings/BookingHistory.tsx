import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import {
  type BookingChange,
  type BookingEquipmentSnapshot,
  type BookingHistoryField,
  bookingApi,
} from "@/lib/bookingApi";
import { bookingStatusNames } from "@/lib/bookingPresentation";
import { getErrorMessage } from "@/lib/userFacingMessages";

type HistoryState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; changes: BookingChange[] };

const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const bookingTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "medium",
});

const fieldLabels: Record<BookingHistoryField, string> = {
  START_TIME: "Начало",
  END_TIME: "Окончание",
  REASON: "Цель бронирования",
  COMMENT: "Комментарий пользователя",
  ADMIN_COMMENT: "Комментарий администратора",
  STATUS: "Статус",
};

function formatFieldValue(field: BookingHistoryField, value: string | null) {
  if (!value?.trim()) return "—";
  if (field === "START_TIME" || field === "END_TIME")
    return bookingTimeFormat.format(new Date(value));
  if (field === "STATUS") return bookingStatusNames[value] ?? value;
  return value;
}

function ChangedEquipment({
  label,
  items,
}: {
  label: string;
  items: BookingEquipmentSnapshot[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="font-medium">{label}</p>
      <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item.eqItemId} className="break-words">
            {item.modelName}{" "}
            <span className="tabular-nums">({item.inventoryNumber})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BookingHistory({ bookingId }: { bookingId: number }) {
  const [history, setHistory] = useState<HistoryState>({ status: "idle" });

  async function loadHistory() {
    setHistory({ status: "loading" });
    try {
      const changes = await bookingApi.get_history(bookingId);
      setHistory({ status: "loaded", changes });
    } catch (error) {
      setHistory({
        status: "error",
        message: getErrorMessage(
          error,
          "Не удалось загрузить историю изменений",
        ),
      });
    }
  }

  return (
    <details
      className="group rounded-xl border border-border bg-card"
      onToggle={(event) => {
        if (event.currentTarget.open && history.status === "idle")
          void loadHistory();
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-6 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
        История изменений бронирования
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-border px-6 pb-4 text-sm">
        {history.status === "loading" && (
          <output className="block pt-4 text-muted-foreground">
            Загружаем историю…
          </output>
        )}
        {history.status === "error" && (
          <ErrorMessage
            className="mt-4"
            message={history.message}
            onRetry={() => void loadHistory()}
          />
        )}
        {history.status === "loaded" &&
          (history.changes.length === 0 ? (
            <p className="pt-4 text-muted-foreground">
              В истории пока нет изменений бронирования.
            </p>
          ) : (
            <ol className="divide-y divide-border">
              {history.changes.map((change) => (
                <li
                  key={change.revision}
                  className="space-y-3 pt-4 pb-4 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-semibold break-words">
                      {change.actorName}
                    </p>
                    <time
                      dateTime={change.changedAt}
                      className="text-muted-foreground"
                    >
                      {dateTimeFormat.format(new Date(change.changedAt))}
                    </time>
                  </div>
                  {change.fields.length > 0 && (
                    <dl className="space-y-2">
                      {change.fields.map(({ field, before, after }) => (
                        <div key={field}>
                          <dt className="font-medium">{fieldLabels[field]}</dt>
                          <dd className="mt-1 grid gap-2 whitespace-pre-wrap break-words sm:grid-cols-2 sm:gap-4">
                            <div className="min-w-0 text-muted-foreground">
                              <span className="block text-xs">Было</span>
                              {formatFieldValue(field, before)}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs text-muted-foreground">
                                Стало
                              </span>
                              {formatFieldValue(field, after)}
                            </div>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="space-y-2">
                    <ChangedEquipment label="Добавлено" items={change.added} />
                    <ChangedEquipment label="Удалено" items={change.removed} />
                  </div>
                </li>
              ))}
            </ol>
          ))}
      </div>
    </details>
  );
}
