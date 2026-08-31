import type { BookingResponseDto } from "@/app/models/booking/booking";
import { formatWarningMessages } from "@/lib/userFacingMessages";

const APPROXIMATE_WARNING_LINE_LENGTH = 32;

export function getEquipmentPreviewLimit(
  booking: Pick<
    BookingResponseDto,
    "equipmentModelIds" | "warnings" | "comment" | "adminComment"
  >,
): number {
  const warningRows = formatWarningMessages(booking.warnings).reduce(
    (rows, message) =>
      rows +
      Math.max(1, Math.ceil(message.length / APPROXIMATE_WARNING_LINE_LENGTH)),
    0,
  );
  const commentBlocks =
    Number(Boolean(booking.comment)) + Number(Boolean(booking.adminComment));
  const availableRows = Math.max(2, warningRows, commentBlocks * 2);

  return Math.min(booking.equipmentModelIds.length, availableRows);
}
