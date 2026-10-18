import type {
  CartResponseDto,
  UpdateCartDetailsDto,
} from "@/app/models/cart/cart";
import { authenticatedGraphqlRequest } from "./authApi";
import {
  bookingFields,
  type GraphqlBooking,
  type GraphqlEquipmentModel,
  mapBooking,
  mapEquipmentModel,
} from "./graphqlMappers";

type GraphqlCart = {
  id: number;
  editingBookingId: number | null;
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
  eqModel: GraphqlEquipmentModel;
};

function mapCart(cart: GraphqlCart): CartResponseDto {
  return {
    id: cart.id,
    editingBookingId: cart.editingBookingId,
    reason: cart.reason,
    startTime: cart.startTime,
    endTime: cart.endTime,
    comment: cart.comment,
    updatedAt: cart.updatedAt,
    items: cart.items.map((item) => ({
      id: item.id,
      eqModelId: item.eqModelId,
      quantity: item.quantity,
      model: mapEquipmentModel(item.eqModel),
    })),
  };
}

const cartFields = `
  id
  editingBookingId
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
    const data = await authenticatedGraphqlRequest<{
      setCartDetails: GraphqlCart;
    }>(
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
    const data = await authenticatedGraphqlRequest<{
      addCartItem: GraphqlCart;
    }>(
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
    const data = await authenticatedGraphqlRequest<{
      removeCartItem: GraphqlCart;
    }>(
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

  add_booking_items_to_cart: async (bookingId: number) => {
    const data = await authenticatedGraphqlRequest<{
      addBookingItemsToCart: GraphqlCart;
    }>(
      `
        mutation AddBookingItemsToCart($bookingId: Int!) {
          addBookingItemsToCart(bookingId: $bookingId) {
            ${cartFields}
          }
        }
      `,
      { bookingId },
    );

    return mapCart(data.addBookingItemsToCart);
  },

  prepare_booking_edit: async (bookingId: number) => {
    const data = await authenticatedGraphqlRequest<{
      prepareBookingEdit: GraphqlCart;
    }>(
      `
        mutation PrepareBookingEdit($bookingId: Int!) {
          prepareBookingEdit(bookingId: $bookingId) {
            ${cartFields}
          }
        }
      `,
      { bookingId },
    );

    return mapCart(data.prepareBookingEdit);
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

  update_booking_from_cart: async (bookingId: number) => {
    const data = await authenticatedGraphqlRequest<{
      updateBookingFromCart: GraphqlBooking;
    }>(
      `
        mutation UpdateBookingFromCart($bookingId: Int!) {
          updateBookingFromCart(bookingId: $bookingId) {
            ${bookingFields}
          }
        }
      `,
      { bookingId },
    );

    return mapBooking(data.updateBookingFromCart);
  },
};
