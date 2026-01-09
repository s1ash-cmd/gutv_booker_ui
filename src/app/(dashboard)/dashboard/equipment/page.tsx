"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { equipmentApi } from '@/lib/equipmentApi';
import { EquipmentCategory } from '@/generated/prisma/enums';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function CreateEquipmentPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [osnova, setOsnova] = useState(false);
  const [itemCount, setItemCount] = useState(1);
  const [attributes, setAttributes] = useState<Array<{ key: string; value: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!name || name.trim() === "") {
      newErrors.name = "Название не может быть пустым";
    } else if (name.trim().length < 2) {
      newErrors.name = "Название должно содержать не менее 2 символов";
    }

    if (!description || description.trim() === "") {
      newErrors.description = "Описание не может быть пустым";
    } else if (description.trim().length < 5) {
      newErrors.description = "Описание должно содержать не менее 5 символов";
    }

    if (!category) {
      newErrors.category = "Выберите категорию оборудования";
    }

    if (itemCount < 1) {
      newErrors.itemCount = "Необходимо создать хотя бы 1 экземпляр";
    } else if (itemCount > 100) {
      newErrors.itemCount = "Максимум 100 экземпляров за раз";
    }

    attributes.forEach((attr, index) => {
      if (!attr.key.trim()) {
        newErrors[`attr_key_${index}`] = "Название атрибута не может быть пустым";
      }
      if (!attr.value.trim()) {
        newErrors[`attr_value_${index}`] = "Значение атрибута не может быть пустым";
      }
    });

    return newErrors;
  };

  const addAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    const newAttrs = attributes.filter((_, i) => i !== index);
    setAttributes(newAttrs);
    clearError(`attr_key_${index}`);
    clearError(`attr_value_${index}`);
  };

  const updateAttribute = (index: number, field: 'key' | 'value', value: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = value;
    setAttributes(newAttrs);
    clearError(`attr_${field}_${index}`);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    try {
      setLoading(true);

      const attributesObject: Record<string, any> = {};
      attributes.forEach(attr => {
        if (attr.key.trim() && attr.value.trim()) {
          attributesObject[attr.key.trim()] = attr.value.trim();
        }
      });

      const equipmentData = {
        name: name.trim(),
        description: description.trim(),
        category: parseInt(category) as EquipmentCategory,
        osnova: osnova,
        attributes: Object.keys(attributesObject).length > 0 ? attributesObject : undefined
      };

      const result = await equipmentApi.create_model(equipmentData);

      const itemPromises = [];
      for (let i = 0; i < itemCount; i++) {
        itemPromises.push(equipmentApi.create_item(result.id));
      }

      await Promise.all(itemPromises);

      router.push(`/equipment/${result.id}`);
    } catch (err: any) {
      console.error('Ошибка создания оборудования:', err);

      let errorMessage = 'Не удалось создать оборудование';

      if (err.message) {
        errorMessage = err.message;
      }

      if (err.response) {
        errorMessage = err.response.data?.message || err.response.data?.title || errorMessage;
      }

      if (err.errors) {
        const validationErrors = Object.entries(err.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        errorMessage = validationErrors || errorMessage;
      }

      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-background py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            size="icon"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Создание оборудования</h1>
            <p className="text-sm text-muted-foreground">
              Добавьте новую модель оборудования в каталог
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
          {errors.form && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {errors.form}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Название <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Например: Canon EOS R5"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              className={errors.name ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Описание <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Подробное описание оборудования..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearError('description');
              }}
              rows={4}
              className={errors.description ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Категория <span className="text-destructive">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                clearError('category');
              }}
              disabled={loading}
            >
              <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryNames).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">
                {errors.category}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemCount">
              Количество экземпляров <span className="text-destructive">*</span>
            </Label>
            <Input
              id="itemCount"
              type="number"
              min="1"
              max="100"
              placeholder="Введите количество"
              value={itemCount}
              onChange={(e) => {
                setItemCount(parseInt(e.target.value) || 1);
                clearError('itemCount');
              }}
              className={errors.itemCount ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.itemCount && (
              <p className="text-sm text-destructive">
                {errors.itemCount}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Будет создано {itemCount} {itemCount === 1 ? 'экземпляр' : itemCount > 1 && itemCount < 5 ? 'экземпляра' : 'экземпляров'} с уникальными инвентарными номерами
            </p>
          </div>

          {/* Osnova чекбокс */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="osnova"
              checked={osnova}
              onCheckedChange={(checked) => setOsnova(checked as boolean)}
              disabled={loading}
            />
            <Label
              htmlFor="osnova"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Доступно только основы
            </Label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Атрибуты (необязательно)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAttribute}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить атрибут
              </Button>
            </div>

            {attributes.length > 0 && (
              <div className="space-y-3">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Название (например: Разрешение)"
                        value={attr.key}
                        onChange={(e) => updateAttribute(index, 'key', e.target.value)}
                        className={errors[`attr_key_${index}`] ? "border-destructive" : ""}
                        disabled={loading}
                      />
                      {errors[`attr_key_${index}`] && (
                        <p className="text-sm text-destructive">
                          {errors[`attr_key_${index}`]}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Значение (например: 45 МП)"
                        value={attr.value}
                        onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                        className={errors[`attr_value_${index}`] ? "border-destructive" : ""}
                        disabled={loading}
                      />
                      {errors[`attr_value_${index}`] && (
                        <p className="text-sm text-destructive">
                          {errors[`attr_value_${index}`]}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttribute(index)}
                      disabled={loading}
                      className="mt-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {attributes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Добавьте атрибуты для указания характеристик оборудования (разрешение, вес, размер матрицы и т.д.)
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Создание...
                </>
              ) : (
                'Создать оборудование'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              disabled={loading}
            >
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
