import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/authUtils";
import { BookingService } from "@/services/bookingService";

const bookingService = new BookingService();

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const bookings = await bookingService.getAllBookings();
    return NextResponse.json(bookings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
