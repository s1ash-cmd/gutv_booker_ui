export enum EquipmentAccess {
  User = 0,
  Osnova = 1,
  Ronin = 2
}

export enum EquipmentCategory {
  Camera = 0,
  Lens = 1,
  Card = 2,
  Battery = 3,
  Charger = 4,
  Sound = 5,
  Stand = 6,
  Light = 7,
  Other = 8
}

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