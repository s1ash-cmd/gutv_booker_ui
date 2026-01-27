import { prisma } from '@/lib/prisma'
import { Booking } from '@/generated/prisma/client'
import {
  CreateBookingRequestDto,
  BookingResponseDto,
  BookingItemDto,
  BookingStatus,
} from '@/app/models/booking/booking'
//import { TelegramNotificationService } from './telegramNotificationService'
import { EquipmentAccess } from '@/app/models/equipment/equipment'
import { UserRole } from '@/app/models/user/user'

export class BookingService {
  // private notificationService: TelegramNotificationService

  // constructor(notificationService: TelegramNotificationService) {
  //   this.notificationService = notificationService
  // }

  private createDtoToBooking(request: CreateBookingRequestDto) {
    return {
      reason: request.reason,
      startTime: new Date(request.startTime),
      endTime: new Date(request.endTime),
      status: BookingStatus.Pending,
      warningsJson: JSON.stringify({}),
      comment: request.comment || null
    }
  }

  static bookingToResponseDto(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      reason: booking.reason,
      creationTime: booking.creationTime,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: BookingStatus[booking.status as number],
      comment: booking.comment,
      adminComment: booking.adminComment,
      warnings: JSON.parse(booking.warningsJson),
      userName: booking.user?.name ?? '',
      login: booking.user?.login ?? '',
      telegramUsername: booking.user?.telegramUsername ?? '',
      equipmentModelIds: booking.bookingItems?.map((bi: any) => ({
        id: bi.id,
        equipmentItemId: bi.equipmentItemId,
        inventoryNumber: bi.equipmentItem?.inventoryNumber ?? '',
        modelName: bi.equipmentItem?.equipmentModel?.name ?? '',
        startDate: bi.startDate,
        endDate: bi.endDate,
        isReturned: bi.isReturned
      })) ?? []
    }
  }

  private async getAvailableItems(
    equipmentModelId: number,
    start: Date,
    end: Date,
    requiredCount: number
  ) {
    const items = await prisma.equipmentItem.findMany({
      where: {
        equipmentModelId,
        available: true,
        bookingItems: {
          none: {
            AND: [
              {
                booking: {
                  status: {
                    in: [BookingStatus.Pending, BookingStatus.Approved]
                  }
                }
              },
              {
                startDate: { lt: end }
              },
              {
                endDate: { gt: start }
              }
            ]
          }
        }
      },
      include: {
        equipmentModel: true
      },
      take: requiredCount + 1
    })

    return items.slice(0, requiredCount)
  }

  async createBooking(request: CreateBookingRequestDto, userId: number): Promise<BookingResponseDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    const startTime = new Date(request.startTime)
    const endTime = new Date(request.endTime)

    if (startTime >= endTime) {
      throw new Error('Дата начала должна быть раньше даты окончания')
    }

    if (!request.equipment || request.equipment.length === 0) {
      throw new Error('Не выбрано оборудование для бронирования')
    }

    const warnings: Record<string, any> = {}
    const daysDiff = (startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysDiff < 2) {
      warnings['Неверная дата'] = 'Бронирование создается меньше чем за 3 дня'
    }

    const bookingItems = []

    for (const item of request.equipment) {
      if (item.quantity <= 0) {
        throw new Error(`Количество для модели '${item.modelName}' должно быть больше 0`)
      }

      const eqModel = await prisma.equipmentModel.findFirst({
        where: { name: item.modelName }
      })

      if (!eqModel) {
        throw new Error(`Модель оборудования '${item.modelName}' не найдена`)
      }

      switch (eqModel.access) {
        case EquipmentAccess.Ronin:
          if (user.role < UserRole.Ronin) {
            throw new Error(`У вас нет доступа к оборудованию '${item.modelName}'. Требуется разрешение Ronin`)
          }
          break
        case EquipmentAccess.Osnova:
          if (user.role < UserRole.Osnova) {
            throw new Error(`У вас нет доступа к оборудованию '${item.modelName}'. Требуется быть в основе`)
          }
          break
        case EquipmentAccess.User:
          break
      }

      const availableItems = await this.getAvailableItems(
        eqModel.id,
        startTime,
        endTime,
        item.quantity
      )

      if (availableItems.length < item.quantity) {
        throw new Error(
          `Недостаточно доступного оборудования модели '${item.modelName}'. Доступно: ${availableItems.length}, требуется: ${item.quantity}`
        )
      }

      bookingItems.push(
        ...availableItems.map((equipmentItem) => ({
          equipmentItemId: equipmentItem.id,
          startDate: startTime,
          endDate: endTime,
          isReturned: false
        }))
      )
    }

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        reason: request.reason,
        startTime,
        endTime,
        status: BookingStatus.Pending,
        warningsJson: JSON.stringify(warnings),
        comment: request.comment || null,
        creationTime: new Date(),
        adminComment: null,
        bookingItems: {
          create: bookingItems
        }
      },
      include: {
        user: true,
        bookingItems: {
          include: {
            equipmentItem: {
              include: {
                equipmentModel: true
              }
            }
          }
        }
      }
    })

    //await this.notificationService.notifyAdminsNewBooking(booking)

    return BookingService.bookingToResponseDto(booking)
  }

  async getAllBookings(): Promise<BookingResponseDto[]> {
    const bookings = await prisma.booking.findMany({
      include: {
        user: true,
        bookingItems: {
          include: {
            equipmentItem: {
              include: {
                equipmentModel: true
              }
            }
          }
        }
      }
    })

    return bookings.map(BookingService.bookingToResponseDto)
  }

  async getBookingById(id: number): Promise<BookingResponseDto> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        bookingItems: {
          include: {
            equipmentItem: {
              include: {
                equipmentModel: true
              }
            }
          }
        }
      }
    })

    if (!booking) {
      throw new Error(`Бронирование с ID ${id} не найдено`)
    }

    if (!booking.bookingItems || booking.bookingItems.length === 0) {
      throw new Error('У бронирования нет связанных элементов оборудования')
    }

    return BookingService.bookingToResponseDto(booking)
  }

  async getBookingsByUser(userId: number): Promise<BookingResponseDto[]> {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        user: true,
        bookingItems: {
          include: {
            equipmentItem: {
              include: {
                equipmentModel: true
              }
            }
          }
        }
      }
    })

    if (bookings.length === 0) {
      throw new Error(`У пользователя с ID ${userId} нет бронирований`)
    }

    return bookings.map(BookingService.bookingToResponseDto)
  }

  async getBookingsByEquipmentItem(equipmentItemId: number): Promise<BookingResponseDto[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        bookingItems: {
          some: {
            equipmentItemId
          }
        }
      },
      include: {
        user: true,
        bookingItems: {
          include: {
            equipmentItem: {
              include: {
                equipmentModel: true
              }
            }
          }
        }
      }
    })

    if (bookings.length === 0) {
      throw new Error(`Не найдено бронирований для оборудования с ID ${equipmentItemId}`)
    }

    return bookings.map(BookingService.bookingToResponseDto)
  }

  async getBookingsByStatus(status: BookingStatus): Promise<BookingResponseDto[]> {
    const bookings = await prisma.booking.findMany({
      where: { status },
      include: {
        user: true,
        bookingItems: {
          include: {
            equipmentItem: {
              include: {
                equipmentModel: true
              }
            }
          }
        }
      }
    })

    if (bookings.length === 0) {
      throw new Error(`Нет бронирований со статусом ${BookingStatus[status]}`)
    }

    return bookings.map(BookingService.bookingToResponseDto)
  }

  async getBookingsByInventoryNumber(inventoryNumber: string): Promise<BookingResponseDto[]> {
    if (!inventoryNumber || inventoryNumber.trim() === '') {
      throw new Error('Инвентарный номер не может быть пустым')
    }

    const equipmentItem = await prisma.equipmentItem.findFirst({
      where: {
        inventoryNumber: {
          equals: inventoryNumber,
          mode: 'insensitive'
        }
      }
    })

    if (!equipmentItem) {
      throw new Error(`Оборудование с инвентарным номером ${inventoryNumber} не найдено`)
    }

    const bookings = await prisma.booking.findMany({
      where: {
        bookingItems: {
          some: {
            equipmentItemId: equipmentItem.id
          }
        }
      },
      include: {
        user: true,
        bookingItems: {
          include: {
            equipmentItem: {
              include: {
                equipmentModel: true
              }
            }
          }
        }
      }
    })

    if (bookings.length === 0) {
      throw new Error(`Нет бронирований для оборудования с инвентарным номером ${inventoryNumber}`)
    }

    return bookings.map(BookingService.bookingToResponseDto)
  }

  async approveBooking(bookingId: number, adminComment?: string): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      throw new Error(`Бронирование с ID ${bookingId} не найдено`)
    }

    const oldStatus = BookingStatus[booking.status]

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.Approved,
        adminComment: adminComment || booking.adminComment
      }
    })

    // await this.notificationService.notifyUserBookingStatusChanged(
    //   updatedBooking,
    //   oldStatus,
    //   'Approved'
    // )

    return true
  }

  async completeBooking(bookingId: number): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      throw new Error(`Бронирование с ID ${bookingId} не найдено`)
    }

    const oldStatus = BookingStatus[booking.status]

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.Completed
      }
    })

    // await this.notificationService.notifyUserBookingStatusChanged(
    //   updatedBooking,
    //   oldStatus,
    //   'Completed'
    // )

    return true
  }

  async cancelBooking(
    bookingId: number,
    userId: number,
    isAdmin: boolean,
    adminComment?: string
  ): Promise<boolean> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true
      }
    })

    if (!booking) {
      throw new Error(`Бронирование с ID ${bookingId} не найдено`)
    }

    if (!isAdmin && booking.userId !== userId) {
      throw new Error('Вы не можете отменить чужое бронирование')
    }

    if (booking.status === BookingStatus.Cancelled) {
      throw new Error('Это бронирование уже отменено')
    }

    const oldStatus = BookingStatus[booking.status]

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.Cancelled,
        adminComment: isAdmin && adminComment ? adminComment : booking.adminComment
      }
    })

    // await this.notificationService.notifyUserBookingStatusChanged(
    //   updatedBooking,
    //   oldStatus,
    //   'Cancelled'
    // )

    return true
  }
}