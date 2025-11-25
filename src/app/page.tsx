import { get_all_models } from "@/lib/equipment";

export default async function EquipmentPage() {
  const equipment = await get_all_models();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Оборудование</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {equipment.map((item: any) => (
          <div
            key={item.id}
            className="rounded-xl border p-4 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
