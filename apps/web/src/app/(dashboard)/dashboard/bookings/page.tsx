import { AdminOnly } from "@/components/AdminOnly";
import { BookingsList } from "@/components/bookings/BookingsList";

export default function BookingsPage() {
  return (
    <AdminOnly>
      <BookingsList scope="all" />
    </AdminOnly>
  );
}
