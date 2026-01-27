import { type NextRequest, NextResponse } from "next/server";
import { getUserIdFromToken } from "@/lib/authUtils";
import { BookingService } from "@/services/bookingService";

const bookingService = new BookingService();

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    const bookings = await bookingService.getBookingsByUser(userId);
    return NextResponse.json(bookings);
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
