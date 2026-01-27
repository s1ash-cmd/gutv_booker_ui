import { prisma } from '@/lib/prisma'
import { EquipmentModel, EquipmentItem } from '@/generated/prisma/client'
import {
  EqModelResponseDto,
  CreateEqModelRequestDto,
  EqItemResponseDto,
  EqModelWithItemsDto,
  EquipmentCategory,
  EquipmentAccess
} from '@/app/models/equipment/equipment'
import { BookingStatus } from '@/app/models/booking/booking'

export class EquipmentService {
  static eqModelToResponseDto(eqModel: EquipmentModel): EqModelResponseDto {
    return {
      id: eqModel.id,
      name: eqModel.name,
      description: eqModel.description,
      category: eqModel.category,
      access: eqModel.access,
      attributes: JSON.parse(eqModel.attributesJson)
    }
  }

  static createDtoToEqModel(eqModel: CreateEqModelRequestDto) {
    if (!eqModel) {
      throw new Error('Данные оборудования не могут быть пустыми')
    }

    let access = EquipmentAccess.User

    if (eqModel.name.toLowerCase().includes('ronin')) {
      access = EquipmentAccess.Ronin
    } else if (eqModel.osnova) {
      access = EquipmentAccess.Osnova
    }

    return {
      name: eqModel.name,
      description: eqModel.description,
      category: eqModel.category,
      attributesJson: JSON.stringify(eqModel.attributes ?? {}),
      access
    }
  }

  static eqItemToResponseDto(item: any): EqItemResponseDto {
    return {
      id: item.id,
      inventoryNumber: item.inventoryNumber,
      available: item.available,
      modelName: item.equipmentModel.name,
      modelCategory: EquipmentCategory[item.equipmentModel.category as number]
    }
  }

  createDtoToEqModel(eqModel: CreateEqModelRequestDto) {
    if (!eqModel) {
      throw new Error('Данные оборудования не могут быть пустыми')
    }

    let access = EquipmentAccess.User

    if (eqModel.name.toLowerCase().includes('ronin')) {
      access = EquipmentAccess.Ronin
    } else if (eqModel.osnova) {
      access = EquipmentAccess.Osnova
    }

    return {
      name: eqModel.name,
      description: eqModel.description,
      category: eqModel.category,
      attributesJson: JSON.stringify(eqModel.attributes ?? {}),
      access
    }
  }

  async createEquipmentModel(eqModel: CreateEqModelRequestDto): Promise<EqModelResponseDto> {
    if (!eqModel) {
      throw new Error('Данные оборудования не могут быть пустыми')
    }

    const existing = await prisma.equipmentModel.findFirst({
      where: {
        name: {
          equals: eqModel.name,
          mode: 'insensitive'
        }
      }
    })

    if (existing) {
      throw new Error('Оборудование с таким названием уже существует')
    }

    const equipmentModel = await prisma.equipmentModel.create({
      data: EquipmentService.createDtoToEqModel(eqModel)
    })

    return EquipmentService.eqModelToResponseDto(equipmentModel)
  }

  async getAllEquipmentModels(): Promise<EqModelResponseDto[]> {
    const eqModels = await prisma.equipmentModel.findMany()
    return eqModels.map(EquipmentService.eqModelToResponseDto)
  }

  async getEquipmentModelById(id: number): Promise<EqModelResponseDto> {
    if (id <= 0) {
      throw new Error('Некорректный ID')
    }

    const eqModel = await prisma.equipmentModel.findUnique({
      where: { id }
    })

    if (!eqModel) {
      throw new Error(`Модель оборудования с ID ${id} не найдена`)
    }

    return EquipmentService.eqModelToResponseDto(eqModel)
  }

  async getEquipmentModelByName(name: string): Promise<EqModelResponseDto[]> {
    if (!name || name.trim() === '') {
      throw new Error('Название не может быть пустым')
    }

    const eqModels = await prisma.equipmentModel.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      }
    })

    if (eqModels.length === 0) {
      throw new Error(`Оборудование с названием '${name}' не найдено`)
    }

    return eqModels.map(m => EquipmentService.eqModelToResponseDto(m))
  }

  async getEquipmentModelByCategory(category: EquipmentCategory): Promise<EqModelResponseDto[]> {
    const eqModels = await prisma.equipmentModel.findMany({
      where: { category }
    })

    if (eqModels.length === 0) {
      throw new Error(`Оборудование категории ${category} не найдено`)
    }

    return eqModels.map(m => EquipmentService.eqModelToResponseDto(m))
  }

  async getAvailableToMe(userId: number): Promise<EqModelResponseDto[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    let whereClause = {}

    switch (user.role) {
      case 4:
      case 3:

        break

      case 2:
        whereClause = {
          access: {
            in: [EquipmentAccess.User, EquipmentAccess.Osnova]
          }
        }
        break

      case 1:
        whereClause = {
          access: EquipmentAccess.User
        }
        break

      default:
        throw new Error('Неизвестная роль пользователя')
    }

    const eqModels = await prisma.equipmentModel.findMany({
      where: whereClause
    })

    return eqModels.map(m => EquipmentService.eqModelToResponseDto(m))
  }

  async updateEquipmentModel(id: number, eqModel: CreateEqModelRequestDto): Promise<void> {
    if (id <= 0) {
      throw new Error('ID должен быть положительным')
    }
    if (!eqModel) {
      throw new Error('Данные оборудования не могут быть пустыми')
    }

    const existingModel = await prisma.equipmentModel.findUnique({
      where: { id }
    })

    if (!existingModel) {
      throw new Error(`Модель оборудования с ID ${id} не найдена`)
    }

    const nameExists = await prisma.equipmentModel.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            name: {
              equals: eqModel.name.trim(),
              mode: 'insensitive'
            }
          }
        ]
      }
    })

    if (nameExists) {
      throw new Error('Оборудование с таким названием уже существует')
    }

    const updatedData = EquipmentService.createDtoToEqModel(eqModel)

    await prisma.equipmentModel.update({
      where: { id },
      data: updatedData
    })
  }

  async deleteEquipmentModel(id: number): Promise<void> {
    const eqModel = await prisma.equipmentModel.findUnique({
      where: { id }
    })

    if (!eqModel) {
      throw new Error(`Модель оборудования с ID ${id} не найдена`)
    }

    await prisma.equipmentModel.delete({
      where: { id }
    })
  }

  eqItemToResponseDto(item: any): EqItemResponseDto {
    return {
      id: item.id,
      inventoryNumber: item.inventoryNumber,
      available: item.available,
      modelName: item.equipmentModel.name,
      modelCategory: EquipmentCategory[item.equipmentModel.category]
    }
  }

  async createEquipmentItem(equipmentModelId: number): Promise<EqItemResponseDto> {
    const model = await prisma.equipmentModel.findUnique({
      where: { id: equipmentModelId }
    })

    if (!model) {
      throw new Error('Модель оборудования не найдена')
    }

    const categoryCode = model.category

    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      try {
        const count = await prisma.equipmentItem.count({
          where: { equipmentModelId }
        })

        const nextNumber = count + 1
        const inventoryNumber = `${categoryCode}-${equipmentModelId.toString().padStart(3, '0')}-${nextNumber.toString().padStart(2, '0')}`

        const newItem = await prisma.equipmentItem.create({
          data: {
            equipmentModelId,
            inventoryNumber,
            available: true
          },
          include: {
            equipmentModel: true
          }
        })

        return EquipmentService.eqItemToResponseDto(newItem)

      } catch (error: any) {
        if (error.code === 'P2002') {
          attempts++
          if (attempts >= maxAttempts) {
            throw new Error('Не удалось создать экземпляр после нескольких попыток')
          }
          await new Promise(resolve => setTimeout(resolve, 100 * attempts))
          continue
        }
        throw error
      }
    }

    throw new Error('Не удалось создать экземпляр')
  }

  async getModelsWithItems(): Promise<EqModelWithItemsDto[]> {
    const eqModels = await prisma.equipmentModel.findMany({
      include: {
        equipmentItems: {
          include: {
            equipmentModel: true
          }
        }
      }
    })

    return eqModels.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      access: m.access,
      attributes: JSON.parse(m.attributesJson),
      items: m.equipmentItems.map(i => EquipmentService.eqItemToResponseDto(i))
    }))
  }

  async getAllEquipmentItems(): Promise<EqItemResponseDto[]> {
    const items = await prisma.equipmentItem.findMany({
      include: {
        equipmentModel: true
      }
    })

    return items.map(i => EquipmentService.eqItemToResponseDto(i))
  }

  async getEquipmentItemById(id: number): Promise<EqItemResponseDto> {
    if (id <= 0) {
      throw new Error('Некорректный ID')
    }

    const item = await prisma.equipmentItem.findUnique({
      where: { id },
      include: {
        equipmentModel: true
      }
    })

    if (!item) {
      throw new Error(`Экземпляр оборудования с ID ${id} не найден`)
    }

    return EquipmentService.eqItemToResponseDto(item)
  }

  async getEquipmentItemsByModel(equipmentModelId: number): Promise<EqItemResponseDto[]> {
    const exists = await prisma.equipmentModel.findUnique({
      where: { id: equipmentModelId }
    })

    if (!exists) {
      throw new Error(`Модель оборудования с ID ${equipmentModelId} не найдена`)
    }

    const items = await prisma.equipmentItem.findMany({
      where: { equipmentModelId },
      include: {
        equipmentModel: true
      }
    })

    if (items.length === 0) {
      throw new Error(`Нет экземпляров для модели ${equipmentModelId}`)
    }

    return items.map(i => EquipmentService.eqItemToResponseDto(i))
  }

  async deleteEquipmentItem(id: number): Promise<void> {
    const equipmentItem = await prisma.equipmentItem.findUnique({
      where: { id }
    })

    if (!equipmentItem) {
      throw new Error(`Экземпляр оборудования с ID ${id} не найден`)
    }

    await prisma.equipmentItem.delete({
      where: { id }
    })
  }

  async getAvailableEquipmentItemsByModel(
    equipmentModelId: number,
    start: Date,
    end: Date
  ): Promise<EqItemResponseDto[]> {
    if (equipmentModelId <= 0) {
      throw new Error('Некорректный ID модели')
    }

    if (start >= end) {
      throw new Error('Дата начала должна быть раньше даты окончания')
    }

    const exists = await prisma.equipmentModel.findUnique({
      where: { id: equipmentModelId }
    })

    if (!exists) {
      throw new Error(`Модель оборудования с ID ${equipmentModelId} не найдена`)
    }

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
                startDate: {
                  lt: end
                }
              },
              {
                endDate: {
                  gt: start
                }
              }
            ]
          }
        }
      },
      include: {
        equipmentModel: true
      }
    })

    return items.map(i => EquipmentService.eqItemToResponseDto(i))
  }

  async toggleAvailability(id: number): Promise<void> {
    const equipmentItem = await prisma.equipmentItem.findUnique({
      where: { id }
    })

    if (!equipmentItem) {
      throw new Error(`Экземпляр оборудования с ID ${id} не найден`)
    }

    await prisma.equipmentItem.update({
      where: { id },
      data: {
        available: !equipmentItem.available
      }
    })
  }
}