import { notFound } from "next/navigation";
import { CalendarPrototype } from "@/components/calendar/CalendarPrototype";

export function generateStaticParams() {
  return ["1", "2", "3"].map((variant) => ({ variant }));
}

export default async function CalendarVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (variant !== "1" && variant !== "2" && variant !== "3") notFound();
  return <CalendarPrototype variant={variant} />;
}
