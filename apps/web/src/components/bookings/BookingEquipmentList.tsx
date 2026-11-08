import { CheckCircle, ChevronRight, Cylinder, Package } from "lucide-react";
import Link from "next/link";
import type { BookingItemDto } from "@/app/models/booking/booking";
import { categoryIcons } from "@/components/equipment/categoryIcons";
import { withFrom } from "@/lib/backLink";
import { cn } from "@/lib/utils";

const modelPluralRules = new Intl.PluralRules("ru");
const modelForms: Record<string, string> = {
  one: "модель",
  few: "модели",
  many: "моделей",
  other: "модели",
};

export function BookingEquipmentList({
  items,
  from,
}: {
  items: BookingItemDto[];
  /** Page the equipment link should offer to return to. */
  from?: string;
}) {
  const models = new Map<number, BookingItemDto[]>();
  for (const item of items) {
    const group = models.get(item.modelId);
    if (group) group.push(item);
    else models.set(item.modelId, [item]);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4 sm:px-6 sm:pt-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Package className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Оборудование</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {models.size} {modelForms[modelPluralRules.select(models.size)]} в
            бронировании
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
          {items.length} ед.
        </span>
      </div>

      <ul
        className={cn(
          "divide-y divide-border",
          items.length > 0 && "border-t border-border",
        )}
      >
        {Array.from(models, ([modelId, modelItems]) => {
          const model = modelItems[0];
          const Icon = /адаптер|adapter/i.test(model.modelName)
            ? Cylinder
            : (categoryIcons[model.modelCategory] ?? Package);

          return (
            <li
              key={modelId}
              className="relative flex items-start gap-3 px-4 py-3 transition-colors focus-within:bg-secondary/50 hover:bg-secondary/50 sm:px-6"
            >
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-slate-500 dark:text-slate-300">
                <Icon className="size-[18px]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={
                    from
                      ? withFrom(`/equipment/${modelId}`, from)
                      : `/equipment/${modelId}`
                  }
                  className="block break-words text-sm font-medium outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {model.modelName}
                </Link>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {modelItems.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]",
                        item.isReturned
                          ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                          : "border-border bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      <span className="min-w-0 break-all font-mono">
                        {item.inventoryNumber}
                      </span>
                      {item.isReturned && (
                        <>
                          <CheckCircle
                            className="size-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Возвращено</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs",
                  modelItems.length > 1
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "text-muted-foreground",
                )}
              >
                {modelItems.length} шт.
              </span>
              <ChevronRight
                aria-hidden="true"
                className="mt-1.5 size-4 shrink-0 text-muted-foreground"
              />
            </li>
          );
        })}
      </ul>
      {items.length === 0 && (
        <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-6 sm:pb-6">
          В бронировании нет оборудования.
        </p>
      )}
    </section>
  );
}
