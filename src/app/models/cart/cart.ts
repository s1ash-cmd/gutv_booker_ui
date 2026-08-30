import type { BookingResponseDto } from "@/app/models/booking/booking";
import type { EqModelResponseDto } from "@/app/models/equipment/equipment";

export interface CartItemDto {
  id: number;
  eqModelId: number;
  quantity: number;
  model: EqModelResponseDto;
}

export interface CartDetailsDto {
  reason: string;
  startTime: string | null;
  endTime: string | null;
  comment: string | null;
}

export interface CartResponseDto extends CartDetailsDto {
  id: number;
  editingBookingId: number | null;
  updatedAt: string;
  items: CartItemDto[];
}

export interface UpdateCartDetailsDto {
  reason?: string;
  startTime?: string | null;
  endTime?: string | null;
  comment?: string | null;
}

export interface CreateBookingFromCartResponseDto extends BookingResponseDto {}
