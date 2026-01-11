import {
  BookingResponseDto,
  BookingStatus,
  CreateBookingRequestDto
} from '@/app/models/booking/booking';
import { authenticatedApi } from './authApi';

export const bookingApi = {
  // POST - создать бронирование
  create_booking: (data: CreateBookingRequestDto) =>
    authenticatedApi<BookingResponseDto>('/booking/create_booking', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // GET - получить бронирование по ID
  get_by_id: (id: number) =>
    authenticatedApi<BookingResponseDto>(`/booking/get_by_id/${id}`),

  // GET - получить бронирования
  get_all: () =>
    authenticatedApi<BookingResponseDto[]>('/booking/get_all'),

  // GET - получить бронирования по пользователю
  get_by_user: (userId: number) =>
    authenticatedApi<BookingResponseDto[]>(`/booking/get_by_user/${userId}`),

  // GET - получить свои бронирования
  get_my_bookings: () =>
    authenticatedApi<BookingResponseDto[]>('/booking/get_my_bookings'),

  // GET - получить бронирования по экземпляру оборудования
  get_by_item: (equipmentItemId: number) =>
    authenticatedApi<BookingResponseDto[]>(`/booking/get_by_item/${equipmentItemId}`),

  // GET - получить бронирования по статусу
  get_by_status: (status: BookingStatus) =>
    authenticatedApi<BookingResponseDto[]>(`/booking/get_by_status/${status}`),

  // GET - получить бронирования по инвентарному номеру
  get_by_invnum: (inventoryNumber: string) =>
    authenticatedApi<BookingResponseDto[]>(
      `/booking/get_by_invnum/${encodeURIComponent(inventoryNumber)}`
    ),

  // PATCH - одобрить бронирование
  approve: (bookingId: number, adminComment: string) =>
    authenticatedApi<{ message: string }>(`/booking/approve/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(adminComment)
    }),

  // PATCH - отклонить бронирование
  reject: (bookingId: number, adminComment: string) =>
    authenticatedApi<{ message: string }>(`/booking/reject/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(adminComment)
    }),

  // PATCH - завершить бронирование
  complete: (id: number) =>
    authenticatedApi<{ message: string }>(`/booking/complete/${id}`, {
      method: 'PATCH'
    }),

  // PATCH - отменить бронирование
  cancel: (id: number, adminComment?: string) =>
    authenticatedApi<{ message: string }>(`/booking/cancel/${id}`, {
      method: 'PATCH',
      ...(adminComment && { body: JSON.stringify(adminComment) })
    }),
};
