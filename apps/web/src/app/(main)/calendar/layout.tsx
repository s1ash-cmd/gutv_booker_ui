import type { ReactNode } from "react";
import { CalendarViewSwitch } from "@/components/calendar/CalendarViewSwitch";

export default function CalendarLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="px-4 pt-6">
        <div className="mx-auto max-w-6xl">
          <CalendarViewSwitch />
        </div>
      </div>
      {children}
    </>
  );
}
