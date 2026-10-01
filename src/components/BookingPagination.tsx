import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

export function BookingPagination({
  page,
  pageSize,
  totalCount,
  loading,
  onPageChange,
}: Props) {
  if (totalCount === 0) return null;
  const totalPages = Math.ceil(totalCount / pageSize);
  return (
    <nav
      aria-label="Страницы бронирований"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} из{" "}
        {totalCount}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            Назад
          </Button>
          <span className="text-sm whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Далее
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}
