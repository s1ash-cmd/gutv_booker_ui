import {
  CartResponseDto,
  UpdateCartDetailsDto,
} from "@/app/models/cart/cart";
import {
  EquipmentAccess,
  EquipmentCategory,
  EqModelResponseDto,
} from "@/app/models/equipment/equipment";
import { BookingResponseDto } from "@/app/models/booking/booking";
import { authenticatedGraphqlRequest } from "./authApi";

type GraphqlCart = {
  id: number;
  reason: string;
  startTime: string | null;
  endTime: string | null;
  comment: string | null;
  updatedAt: string;
  items: GraphqlCartItem[];
};

type GraphqlCartItem = {
  id: number;
  eqModelId: number;
  quantity: number;
  eqModel: GraphqlEqModel;
};

type GraphqlEqModel = {
  id: number;
  name: string;
  description: string;
  category: keyof typeof EquipmentCategory | number | string;
  access: keyof typeof EquipmentAccess | number | string;
  attributesJson?: string | null;
};

type GraphqlBooking = {
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
  Other: EquipmentCategory.Other,
};

const accessMap: Record<string, EquipmentAccess> = {
  User: EquipmentAccess.User,
  Osnova: EquipmentAccess.Osnova,
  Ronin: EquipmentAccess.Ronin,
};

function toCategory(value: GraphqlEqModel["category"]) {
  if (typeof value === "number") {
    return value as EquipmentCategory;
  }

  return categoryMap[String(value)] ?? EquipmentCategory.Other;
}

function toAccess(value: GraphqlEqModel["access"]) {
  if (typeof value === "number") {
    return value as EquipmentAccess;
  }

  return accessMap[String(value)] ?? EquipmentAccess.User;
}

function parseJson(value?: string | null) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mapModel(model: GraphqlEqModel): EqModelResponseDto {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    category: toCategory(model.category),
    access: toAccess(model.access),
    attributes: parseJson(model.attributesJson),
  };
}

function mapCart(cart: GraphqlCart): CartResponseDto {
  return {
    id: cart.id,
    reason: cart.reason,
    startTime: cart.startTime,
    endTime: cart.endTime,
    comment: cart.comment,
    updatedAt: cart.updatedAt,
    items: cart.items.map((item) => ({
      id: item.id,
      eqModelId: item.eqModelId,
      quantity: item.quantity,
      model: mapModel(item.eqModel),
    })),
  };
}

function mapBooking(booking: GraphqlBooking): BookingResponseDto {
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
    warnings: parseJson(booking.warningsJson),
    comment: booking.comment ?? null,
    adminComment: booking.adminComment ?? null,
  };
}

const cartFields = `
  id
  reason
  startTime
  endTime
  comment
  updatedAt
  items {
    id
    eqModelId
    quantity
    eqModel {
      id
      name
      description
      category
      access
      attributesJson
    }
  }
`;

const bookingFields = `
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

export const cartApi = {
  get_my_cart: async () => {
    const data = await authenticatedGraphqlRequest<{ myCart: GraphqlCart }>(
      `
        query MyCart {
          myCart {
            ${cartFields}
          }
        }
      `,
    );

    return mapCart(data.myCart);
  },

  set_cart_details: async (input: UpdateCartDetailsDto) => {
    const data = await authenticatedGraphqlRequest<{ setCartDetails: GraphqlCart }>(
      `
        mutation SetCartDetails($input: UpdateCartDetailsInput!) {
          setCartDetails(input: $input) {
            ${cartFields}
          }
        }
      `,
      {
        input: {
          reason: input.reason,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          comment: input.comment ?? null,
        },
      },
    );

    return mapCart(data.setCartDetails);
  },

  add_cart_item: async (eqModelId: number, quantity: number) => {
    const data = await authenticatedGraphqlRequest<{ addCartItem: GraphqlCart }>(
      `
        mutation AddCartItem($eqModelId: Int!, $quantity: Int!) {
          addCartItem(eqModelId: $eqModelId, quantity: $quantity) {
            ${cartFields}
          }
        }
      `,
      { eqModelId, quantity },
    );

    return mapCart(data.addCartItem);
  },

  update_cart_item_quantity: async (eqModelId: number, quantity: number) => {
    const data = await authenticatedGraphqlRequest<{
      updateCartItemQuantity: GraphqlCart;
    }>(
      `
        mutation UpdateCartItemQuantity($eqModelId: Int!, $quantity: Int!) {
          updateCartItemQuantity(eqModelId: $eqModelId, quantity: $quantity) {
            ${cartFields}
          }
        }
      `,
      { eqModelId, quantity },
    );

    return mapCart(data.updateCartItemQuantity);
  },

  remove_cart_item: async (eqModelId: number) => {
    const data = await authenticatedGraphqlRequest<{ removeCartItem: GraphqlCart }>(
      `
        mutation RemoveCartItem($eqModelId: Int!) {
          removeCartItem(eqModelId: $eqModelId) {
            ${cartFields}
          }
        }
      `,
      { eqModelId },
    );

    return mapCart(data.removeCartItem);
  },

  clear_cart: async () => {
    await authenticatedGraphqlRequest<{ clearCart: boolean }>(
      `
        mutation ClearCart {
          clearCart
        }
      `,
    );
  },

  create_booking_from_cart: async () => {
    const data = await authenticatedGraphqlRequest<{
      createBookingFromCart: GraphqlBooking;
    }>(
      `
        mutation CreateBookingFromCart {
          createBookingFromCart {
            ${bookingFields}
          }
        }
      `,
    );

    return mapBooking(data.createBookingFromCart);
  },
};
