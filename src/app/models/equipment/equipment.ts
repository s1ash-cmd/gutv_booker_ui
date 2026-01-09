import { EquipmentAccess, EquipmentCategory } from '@/generated/prisma/enums';

export interface CreateEqModelRequestDto {
  name: string;
  description: string;
  category: EquipmentCategory;
  osnova: boolean;
  attributes?: Record<string, any>;
}

export interface EqModelResponseDto {
  id: number;
  name: string;
  description: string;
  category: EquipmentCategory;
  access: EquipmentAccess;
  attributes: Record<string, any>;
}

export interface EqItemResponseDto {
  id: number;
  inventoryNumber: string;
  available: boolean;
  modelName: string | null;
  modelCategory: string | null;
}

export interface EqModelWithItemsDto {
  id: number;
  name: string;
  description: string;
  category: EquipmentCategory;
  access: EquipmentAccess;
  attributes: Record<string, any>;
  items: EqItemResponseDto[];
}