export enum BookingStatus {
  Pending = 0,
  Cancelled = 1,
  Approved = 2,
  Completed = 3
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
  modelName: string;
  inventoryNumber: string;
  startDate: string;
  endDate: string;
  isReturned: boolean;
}

export interface BookingResponseDto {
  id: number;
  userName: string;
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

export interface EquipmentRequestItem {
  modelName: string;
  quantity: number;
}

export interface CreateBookingRequestDto {
  reason: string;
  startTime: string;
  endTime: string;
  comment?: string | null;
  equipment: EquipmentRequestItem[];
}