import type { EquipmentCategory } from "@/app/models/equipment/equipment";

export enum BookingStatus {
  Pending = 0,
  Cancelled = 1,
  Approved = 2,
  Completed = 3,
}

export interface BookingItem {
  id: number;
  bookingId: number;
  equipmentItemId: number;
  startDate: string;
  endDate: string;
  isReturned: boolean;
}

export interface BookingItemDto {
  id: number;
  equipmentItemId: number;
  modelId: number;
  modelName: string;
  modelCategory: EquipmentCategory;
  inventoryNumber: string;
  startDate: string;
  endDate: string;
  isReturned: boolean;
  isExplicitlySelected: boolean;
}

export interface BookingResponseDto {
  id: number;
  revision: number;
  userName: string;
  userRole?: string;
  userAvatarSeed?: string | null;
  userAvatarUrl?: string | null;
  login: string;
  telegramUsername: string;
  reason: string;
  creationTime: string;
  startTime: string;
  endTime: string;
  status: string;
  equipmentModelIds: BookingItemDto[];
  warnings: Record<string, any>;
  comment: string | null;
  adminComment?: string | null;
}

export interface CalendarEquipmentDto {
  id: number;
  modelName: string;
  inventoryNumber: string;
}

export interface BookingCalendarItemDto {
  id: number;
  userName: string;
  telegramUsername: string;
  reason: string;
  startTime: string;
  endTime: string;
  status: string;
  equipment: CalendarEquipmentDto[];
}

export interface EquipmentRequestItem {
  eqModelId: number;
  quantity: number;
  selectedItemIds?: number[];
}

export interface CreateBookingRequestDto {
  reason: string;
  startTime: string;
  endTime: string;
  comment?: string | null;
  equipment: EquipmentRequestItem[];
}
