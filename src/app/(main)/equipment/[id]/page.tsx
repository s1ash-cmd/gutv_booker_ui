"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, CheckCircle, XCircle, Hash } from 'lucide-react';
import { equipmentApi } from '@/lib/equipmentApi';
import { EqModelResponseDto, EqItemResponseDto, EquipmentCategory, EquipmentAccess } from '@/app/types/equipment';
import { Button } from '@/components/ui/button';

const categoryNames: Record<EquipmentCategory, string> = {
  [EquipmentCategory.Camera]: 'Камера',
  [EquipmentCategory.Lens]: 'Объектив',
  [EquipmentCategory.Card]: 'Карта памяти',
  [EquipmentCategory.Battery]: 'Аккумулятор',
  [EquipmentCategory.Charger]: 'Зарядное устройство',
  [EquipmentCategory.Sound]: 'Звук',
  [EquipmentCategory.Stand]: 'Штатив',
  [EquipmentCategory.Light]: 'Свет',
  [EquipmentCategory.Other]: 'Прочее',
};

const accessNames: Record<EquipmentAccess, string> = {
  [EquipmentAccess.User]: 'Все пользователи',
  [EquipmentAccess.Osnova]: 'Основа',
  [EquipmentAccess.Ronin]: 'Требуется разрешение',
};

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [model, setModel] = useState<EqModelResponseDto | null>(null);
  const [items, setItems] = useState<EqItemResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const id = parseInt(params.id as string);

        const [modelData, itemsData] = await Promise.all([
          equipmentApi.get_model_by_id(id),
          equipmentApi.get_items_by_model(id)
        ]);

        setModel(modelData);
        setItems(itemsData);
      } catch (err) {
        setError('Ошибка загрузки оборудования');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  if (loading) {
    return (
      <main className="bg-background py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-muted-foreground">Загрузка...</p>
        </div>
      </main>
    );
  }

  if (error || !model) {
    return (
      <main className="bg-background py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-destructive">{error || 'Оборудование не найдено'}</p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться назад
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const availableCount = items.filter(i => i.available).length;

  return (
    <main className="bg-background py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к списку
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-xs font-semibold mb-3">
                    {categoryNames[model.category]}
                  </span>
                  <h1 className="text-3xl font-bold text-foreground">
                    {model.name}
                  </h1>
                </div>
              </div>

              {model.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {model.description}
                </p>
              )}
            </div>

            {Object.keys(model.attributes).length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Технические характеристики
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(model.attributes).map(([key, value]) => (
                    <div key={key} className="border-l-2 border-primary pl-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {key}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Экземпляры оборудования
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {item.inventoryNumber}
                          </span>
                        </div>
                        {item.available ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.available ? 'Доступен для бронирования' : 'Забронирован'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Статистика
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Всего единиц</span>
                    <span className="text-2xl font-bold text-foreground">{items.length}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Доступно</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {availableCount}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${items.length > 0 ? (availableCount / items.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Занято</span>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {items.length - availableCount}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${items.length > 0 ? ((items.length - availableCount) / items.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Уровень доступа
              </h3>
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <Shield className={`w-5 h-5 ${model.access === EquipmentAccess.User ? 'text-green-500' :
                  model.access === EquipmentAccess.Osnova ? 'text-yellow-500' :
                    'text-red-500'
                  }`} />
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {accessNames[model.access]}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {model.access === EquipmentAccess.User && 'Доступно всем пользователям'}
                    {model.access === EquipmentAccess.Osnova && 'Доступно только основе'}
                    {model.access === EquipmentAccess.Ronin && 'Требуется сдать экзамен'}
                  </div>
                </div>
              </div>
            </div>

            <Button className="w-full" size="lg">
              Забронировать
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
