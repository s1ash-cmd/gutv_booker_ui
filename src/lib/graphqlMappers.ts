import type { BookingResponseDto } from "@/app/models/booking/booking";
import {
  type EqItemResponseDto,
  type EqModelResponseDto,
  EquipmentAccess,
  EquipmentCategory,
} from "@/app/models/equipment/equipment";

export type GraphqlEquipmentModel = {
  id: number;
  name: string;
  description: string;
  category: keyof typeof EquipmentCategory | number | string;
  access: keyof typeof EquipmentAccess | number | string;
  attributesJson?: string | null;
};

export type GraphqlEquipmentItem = {
  id: number;
  inventoryNumber: string;
  operable: boolean;
  eqModel?: {
    name: string;
    category: keyof typeof EquipmentCategory | number | string;
  } | null;
};

export type GraphqlBooking = {
  id: number;
  reason: string;
  creationTime: string;
  startTime: string;
  endTime: string;
  status: string;
  warningsJson?: string | null;
  comment?: string | null;
  adminComment?: string | null;
  user: {
    name: string;
    login: string;
    telegramUsername?: string | null;
  };
  bookingItems: Array<{
    id: number;
    eqItemId: number;
    startDate: string;
    endDate: string;
    isReturned: boolean;
    eqItem: {
      inventoryNumber: string;
      eqModel: {
        name: string;
      };
    };
  }>;
};

const categoryMap: Record<string, EquipmentCategory> = {
  Camera: EquipmentCategory.Camera,
  Lens: EquipmentCategory.Lens,
  Card: EquipmentCategory.Card,
  Battery: EquipmentCategory.Battery,
  Charger: EquipmentCategory.Charger,
  Sound: EquipmentCategory.Sound,
  Stand: EquipmentCategory.Stand,
  Light: EquipmentCategory.Light,
  Filters: EquipmentCategory.Filters,
  Other: EquipmentCategory.Other,
};

const accessMap: Record<string, EquipmentAccess> = {
  User: EquipmentAccess.User,
  Osnova: EquipmentAccess.Osnova,
  Ronin: EquipmentAccess.Ronin,
};

function parseJsonObject(value?: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function mapEquipmentCategory(value: GraphqlEquipmentModel["category"]) {
  if (typeof value === "number") {
    return value as EquipmentCategory;
  }

  return categoryMap[String(value)] ?? EquipmentCategory.Other;
}

function mapEquipmentAccess(value: GraphqlEquipmentModel["access"]) {
  if (typeof value === "number") {
    return value as EquipmentAccess;
  }

  return accessMap[String(value)] ?? EquipmentAccess.User;
}

export function mapEquipmentModel(
  model: GraphqlEquipmentModel,
): EqModelResponseDto {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    category: mapEquipmentCategory(model.category),
    access: mapEquipmentAccess(model.access),
    attributes: parseJsonObject(model.attributesJson),
  };
}

export function mapEquipmentItem(
  item: GraphqlEquipmentItem,
): EqItemResponseDto {
  const category = item.eqModel?.category;

  return {
    id: item.id,
    inventoryNumber: item.inventoryNumber,
    available: item.operable,
    modelName: item.eqModel?.name ?? null,
    modelCategory:
      category === undefined || category === null
        ? null
        : (EquipmentCategory[mapEquipmentCategory(category)] ?? null),
  };
}

export function mapBooking(booking: GraphqlBooking): BookingResponseDto {
  return {
    id: booking.id,
    userName: booking.user.name,
    login: booking.user.login,
    telegramUsername: booking.user.telegramUsername ?? "",
    reason: booking.reason,
    creationTime: booking.creationTime,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    equipmentModelIds: booking.bookingItems.map((item) => ({
      id: item.id,
      equipmentItemId: item.eqItemId,
      modelName: item.eqItem.eqModel.name,
      inventoryNumber: item.eqItem.inventoryNumber,
      startDate: item.startDate,
      endDate: item.endDate,
      isReturned: item.isReturned,
    })),
    warnings: parseJsonObject(booking.warningsJson),
    comment: booking.comment ?? null,
    adminComment: booking.adminComment ?? null,
  };
}

export const bookingFields = `
  id
  reason
  creationTime
  startTime
  endTime
  status
  warningsJson
  comment
  adminComment
  user {
    name
    login
    telegramUsername
  }
  bookingItems {
    id
    eqItemId
    startDate
    endDate
    isReturned
    eqItem {
      inventoryNumber
      eqModel {
        name
      }
    }
  }
`;

export const equipmentModelFields = `
  id
  name
  description
  category
  access
  attributesJson
`;

export const equipmentItemFields = `
  id
  inventoryNumber
  operable
  eqModel {
    name
    category
  }
`;
