// import Image from "next/image";
//
// export default function Home() {
//     return (
//         <main >
//
//         </main>
//     );
// }

// 1. Описываем тип данных (ВНИМАНИЕ: имена полей должны точь-в-точь совпадать с JSON из Swagger)
interface EquipmentModel {
  id: number; // или string, если у вас GUID
  name: string; // пример: посмотрите, как поле называется в JSON (может ModelName?)
  description?: string; // знак ? значит поле может быть пустым
  // Добавьте сюда остальные поля, которые хотите вывести
}

// 2. Функция получения данных
async function getEquipment(): Promise<EquipmentModel[]> {
  const res = await fetch("https://api.gutvbooker.ru/api/Equipment/get_all_models", {
    method: "GET", // Swagger обычно показывает GET, но проверьте (иногда бывает POST)
    cache: "no-store", // 'no-store' гарантирует, что данные будут свежими при каждом обновлении страницы
  });

  if (!res.ok) {
    // Это сработает, если сервер вернет ошибку (например, 500)
    throw new Error(`Ошибка загрузки: ${res.status}`);
  }

  return res.json();
}

// 3. Основной компонент страницы
export default async function Home() {
  let equipment: EquipmentModel[] = [];
  let errorMsg = "";

  try {
    equipment = await getEquipment();
  } catch (e) {
    errorMsg = "Не удалось загрузить оборудование. Проверьте API.";
    console.error(e);
  }

  return (
    <main style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Список моделей оборудования</h1>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      <div
        style={{
          display: "grid",
          gap: "15px",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        }}
      >
        {/* 4. Пробегаемся по массиву и рисуем карточки */}
        {equipment.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              borderRadius: "8px",
            }}
          >
            {/* Здесь используйте имена полей из вашего интерфейса */}
            <h3 style={{ margin: "0 0 10px 0" }}>{item.name || "Без названия"}</h3>
            <p>ID: {item.id}</p>
            {/* Если есть описание */}
            {item.description && <p>{item.description}</p>}
          </div>
        ))}

        {equipment.length === 0 && !errorMsg && <p>Список пуст.</p>}
      </div>
    </main>
  );
}
