import { type NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/authUtils";
import { BookingService } from "@/services/bookingService";

const bookingService = new BookingService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserIdFromToken(request);
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    const booking = await bookingService.getBookingById(id);
    return NextResponse.json(booking);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Invalid token") {
      return NextResponse.json(
        {
          error:
            error.message === "Unauthorized"
              ? "Пользователь не авторизован"
              : "Недействительный токен",
        },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
