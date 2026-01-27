import { CreateEqModelRequestDto, EqItemResponseDto, EqModelResponseDto, EqModelWithItemsDto, EquipmentCategory } from '@/app/models/equipment/equipment';

import { api } from './api';
import { authenticatedApi } from './authApi';

export const equipmentApi = {
  // POST - создать модель оборудования
  create_model: (data: CreateEqModelRequestDto) =>
    authenticatedApi<EqModelResponseDto>('/api/equipment/create_model', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // GET - получить модели с экземплярами
  get_models_with_items: () =>
    api<EqModelWithItemsDto[]>('/api/equipment/get_models_with_items'),

  // GET - все модели
  get_all_models: () =>
    api<EqModelResponseDto[]>('/api/equipment/get_all_models'),

  // GET - модель по ID
  get_model_by_id: (id: number) =>
    api<EqModelResponseDto>(`/api/equipment/get_model_by_id/${id}`),

  // GET - модели по имени
  get_model_by_name: (name: string) =>
    api<EqModelResponseDto[]>(`/api/equipment/get_model_by_name/${name}`),

  // GET - модели по категории
  get_model_by_category: (category: EquipmentCategory) =>
    api<EqModelResponseDto[]>(`/api/equipment/get_model_by_category/${category}`),

  // GET - доступные мне модели
  available_models_to_me: () =>
    authenticatedApi<EqModelResponseDto[]>('/api/equipment/available_models_to_me'),

  // GET - доступные экземпляры по модели и диапазону дат
  get_available_items_by_model: (modelId: number, startIso: string, endIso: string) => {
    const params = new URLSearchParams({
      modelId: String(modelId),
      start: startIso,
      end: endIso,
    });

    return api<EqItemResponseDto[]>(
      `/api/equipment/get_available_items_by_model?${params.toString()}`
    );
  },

  // PUT - обновить модель
  update_model: (id: number, data: CreateEqModelRequestDto) =>
    authenticatedApi<string>(`/api/equipment/update_model/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // DELETE - удалить модель
  delete_model: (id: number) =>
    authenticatedApi<string>(`/api/equipment/delete_model/${id}`, {
      method: 'DELETE'
    }),



  // POST - создать экземпляр оборудования
  create_item: (equipmentModelId: number) =>
    authenticatedApi<EqItemResponseDto>(
      `/api/equipment/create_item?equipmentModelId=${equipmentModelId}`,
      {
        method: 'POST'
      }
    ),

  // GET - все экземпляры
  get_all_items: () =>
    api<EqItemResponseDto[]>('/api/equipment/get_all_items'),

  // GET - экземпляр по ID
  get_item_by_id: (id: number) =>
    api<EqItemResponseDto>(`/api/equipment/get_item_by_id/${id}`),

  // GET - экземпляры по модели
  get_items_by_model: (modelId: number) =>
    api<EqItemResponseDto[]>(`/api/equipment/get_items_by_model/${modelId}`),

  // PATCH - изменить доступность
  toggle_item_available: (id: number) => {
    return authenticatedApi<string>(`/api/equipment/toggle_availability/${id}`, {
      method: 'PATCH'
    });
  },

  // DELETE - удалить экземпляр
  delete_item: (id: number) =>
    authenticatedApi<string>(`/api/equipment/delete_item/${id}`, {
      method: 'DELETE'
    }),
}
