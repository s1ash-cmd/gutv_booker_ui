import {
  CreateEqModelRequestDto,
  EqModelResponseDto,
  EqModelWithItemsDto,
  EqItemResponseDto,
  EquipmentCategory
} from '@/app/types/equipment';
import { authenticatedApi } from './authApi';
import { api } from './api';

export const equipmentApi = {
  // POST - создать модель оборудования
  create_model: (data: CreateEqModelRequestDto) =>
    authenticatedApi<EqModelResponseDto>('/Equipment/create_model', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // GET - получить модели с экземплярами
  get_models_with_items: () =>
    api<EqModelWithItemsDto[]>('/Equipment/get_models_with_items'),

  // GET - все модели
  get_all_models: () =>
    api<EqModelResponseDto[]>('/Equipment/get_all_models'),

  // GET - модель по ID
  get_model_by_id: (id: number) =>
    api<EqModelResponseDto>(`/Equipment/get_model_by_id/${id}`),

  // GET - модели по имени
  get_model_by_name: (name: string) =>
    api<EqModelResponseDto[]>(`/Equipment/get_model_by_name/${name}`),

  // GET - модели по категории
  get_model_by_category: (category: EquipmentCategory) =>
    api<EqModelResponseDto[]>(`/Equipment/get_model_by_category/${category}`),

  // GET - доступные мне модели
  available_models_to_me: () =>
    authenticatedApi<EqModelResponseDto[]>('/Equipment/available_models_to_me'),

  // PUT - обновить модель
  update_model: (id: number, data: CreateEqModelRequestDto) =>
    authenticatedApi<string>(`/Equipment/update_model/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // DELETE - удалить модель
  delete_model: (id: number) =>
    authenticatedApi<string>(`/Equipment/delete_model/${id}`, {
      method: 'DELETE'
    }),



  // POST - создать экземпляр оборудования
  create_item: (equipmentModelId: number) =>
    authenticatedApi<EqItemResponseDto>(
      `/Equipment/create_item?equipmentModelId=${equipmentModelId}`,
      {
        method: 'POST'
      }
    ),

  // GET - все экземпляры
  get_all_items: () =>
    api<EqItemResponseDto[]>('/Equipment/get_all_items'),

  // GET - экземпляр по ID
  get_item_by_id: (id: number) =>
    api<EqItemResponseDto>(`/Equipment/get_item_by_id/${id}`),

  // GET - экземпляры по модели
  get_items_by_model: (modelId: number) =>
    api<EqItemResponseDto[]>(`/Equipment/get_items_by_model/${modelId}`),

  // DELETE - удалить экземпляр
  delete_item: (id: number) =>
    authenticatedApi<string>(`/Equipment/delete_item/${id}`, {
      method: 'DELETE'
    }),
}
