import { type NextRequest, NextResponse } from "next/server";
import type { CreateBookingRequestDto } from "@/app/models/booking/booking";
import { getUserIdFromToken } from "@/lib/authUtils";
import { BookingService } from "@/services/bookingService";

const bookingService = new BookingService();

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    const body: CreateBookingRequestDto = await request.json();
    const booking = await bookingService.createBooking(body, userId);
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
