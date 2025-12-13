import { Ban } from 'lucide-react';

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-md p-8 pb-2 border border-border">
        <h1 className="text-3xl font-bold text-card-foreground mb-6">
          Правила бронирования оборудования студии GUtv
        </h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-card-foreground mb-4">
            Требования для доступа
          </h2>
          <div className="bg-accent p-4 rounded-lg border border-border">
            <p className="text-accent-foreground font-medium">
              Для бронирования оборудования необходимо знать расположение техники.
              Обязательно присутствие на ознакомительной лекции. Без этого доступ к
              бронированию и съемкам не предоставляется
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-card-foreground mb-4">
            Порядок бронирования
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Бронировать минимум за 3 дня до съемок.</strong> Планируйте
              заранее и уважайте время других участников
            </li>
            <li>
              Если позиция занята — свяжитесь с этим человеком напрямую,
              договоритесь, напишите в описании заявки о том, что и у кого вы хотите взять
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-card-foreground mb-4">
            Получение и возврат оборудования
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                При получении:
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>
                  Тщательно осмотрите состояние каждой позиции вашего бронирования
                </li>
                <li>
                  Ответственность за повреждения несет последний, кто брал оборудование
                </li>
                <li>
                  При обнаружении повреждений оборудования / при отсутствии забронированного оборудования, сообщите об этом техническому директору
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                При возврате:
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>
                  Если не можете сдать вовремя — свяжитесь с техническим директором заранее
                </li>
                <li>
                  <strong className="text-foreground">Обязательно сфотографируйте</strong> все оборудование при возврате
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-card-foreground mb-4">
            Срочное бронирование
          </h2>
          <p className="text-muted-foreground">
            Если требуется срочное бронирование (день в день) — свяжитесь с техническим директором
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-card-foreground mb-4">
            Штрафы и наказания
          </h2>

          <div className="space-y-4">
            <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded">
              <h3 className="text-lg font-medium text-foreground mb-3">
                Система нарушений (косяков)
              </h3>
              <p className="text-foreground mb-3">
                Каждое из следующих нарушений засчитывается как 1 косяк:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>
                  Взятие оборудования без предупреждения технического директора
                </li>
                <li>
                  Несвоевременная сдача оборудования без предупреждения технического директора
                </li>
                <li>
                  Повреждение оборудования
                </li>
                <li>
                  Потеря оборудования
                </li>
                <li>
                  Порча циклорамы (разливы, загрязнения, рисунки и прочие повреждения)
                </li>
              </ul>
            </div>

            <div className="bg-destructive/20 border border-destructive p-4 rounded-lg">
              <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Бан на использование оборудования
              </h3>
              <p className="text-foreground mb-2">
                <strong>При накоплении 5 косяков:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1 text-foreground">
                <li>Полная блокировка доступа к оборудованию на 2 недели</li>
                <li>Бронирование и использование техники запрещено</li>
              </ul>
            </div>


            <div className="bg-secondary p-4 rounded-lg border border-border">
              <h3 className="text-lg font-medium text-secondary-foreground mb-2">
                Сброс косяков
              </h3>
              <p className="text-muted-foreground">
                Накопленные косяки обнуляются один раз в полгода либо после отбытия
                бана (блокировки на 2 недели)
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
