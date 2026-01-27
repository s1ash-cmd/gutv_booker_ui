import { type NextRequest, NextResponse } from "next/server";
import { isAdmin as checkIsAdmin, getUserIdFromToken } from "@/lib/authUtils";
import { BookingService } from "@/services/bookingService";

const bookingService = new BookingService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromToken(request);
    const isAdmin = await checkIsAdmin(request);
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    const adminComment = await request.json().catch(() => null);

    await bookingService.cancelBooking(id, userId, isAdmin, adminComment);
    return NextResponse.json({ message: "Бронирование отменено" });
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
    if (error.message.includes("не можете отменить чужое")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
