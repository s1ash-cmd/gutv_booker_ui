import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ErrorMessage } from "@/components/ErrorMessage";
import {
  type BookingEquipmentChange,
  type BookingEquipmentSnapshot,
  bookingApi,
} from "@/lib/bookingApi";
import { getErrorMessage } from "@/lib/userFacingMessages";

type HistoryState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; changes: BookingEquipmentChange[] };

const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

export function BookingEquipmentHistory({ bookingId }: { bookingId: number }) {
  const [history, setHistory] = useState<HistoryState>({ status: "idle" });

  async function loadHistory() {
    setHistory({ status: "loading" });
    try {
      const changes = await bookingApi.get_equipment_history(bookingId);
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
        История изменений оборудования
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
              В истории пока нет изменений оборудования.
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
