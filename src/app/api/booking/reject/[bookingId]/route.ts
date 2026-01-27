import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/authUtils";
import { BookingService } from "@/services/bookingService";

const bookingService = new BookingService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { bookingId: idParam } = await params;
    const bookingId = parseInt(idParam, 10);
    const adminComment = await request.json();
    await bookingService.cancelBooking(bookingId, 0, true, adminComment);
    return NextResponse.json({ message: "Бронирование отклонено" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
