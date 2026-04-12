import {
  CreateEqModelRequestDto,
  EquipmentAccess,
  EquipmentCategory,
  EqItemResponseDto,
  EqModelResponseDto,
  EqModelWithItemsDto,
} from "@/app/models/equipment/equipment";
import { graphqlNamedEnumLiteral, graphqlRequest } from "./api";
import { authenticatedGraphqlRequest } from "./authApi";

type GraphqlEquipmentModel = {
  id: number;
  name: string;
  description: string;
  category: keyof typeof EquipmentCategory | number | string;
  access: keyof typeof EquipmentAccess | number | string;
  attributesJson?: string | null;
};

type GraphqlEquipmentItem = {
  id: number;
  inventoryNumber: string;
  operable: boolean;
  eqModel?: {
    name: string;
    category: keyof typeof EquipmentCategory | number | string;
  } | null;
};

type GraphqlEquipmentModelWithItems = GraphqlEquipmentModel & {
  items: GraphqlEquipmentItem[];
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

function toCategory(value: GraphqlEquipmentModel["category"]) {
  if (typeof value === "number") {
    return value as EquipmentCategory;
  }

  return categoryMap[String(value)] ?? EquipmentCategory.Other;
}

function toAccess(value: GraphqlEquipmentModel["access"]) {
  if (typeof value === "number") {
    return value as EquipmentAccess;
  }

  return accessMap[String(value)] ?? EquipmentAccess.User;
}

function toAttributes(attributesJson?: string | null) {
  if (!attributesJson) {
    return {};
  }

  try {
    return JSON.parse(attributesJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toCategoryName(value: string | number) {
  const category = toCategory(value);
  return EquipmentCategory[category] ?? null;
}

function mapModel(model: GraphqlEquipmentModel): EqModelResponseDto {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    category: toCategory(model.category),
    access: toAccess(model.access),
    attributes: toAttributes(model.attributesJson),
  };
}

function mapItem(item: GraphqlEquipmentItem): EqItemResponseDto {
  return {
    id: item.id,
    inventoryNumber: item.inventoryNumber,
    available: item.operable,
    modelName: item.eqModel?.name ?? null,
    modelCategory: item.eqModel?.category
      ? toCategoryName(item.eqModel.category)
      : null,
  };
}

function escapeGraphqlString(value: string) {
  return JSON.stringify(value);
}

function buildEquipmentInputLiteral(data: CreateEqModelRequestDto) {
  const categoryLiteral = graphqlNamedEnumLiteral(
    EquipmentCategory[data.category],
    "Other",
  );
  const attributesJson = JSON.stringify(data.attributes ?? {});

  return `{
    name: ${escapeGraphqlString(data.name)}
    description: ${escapeGraphqlString(data.description)}
    category: ${categoryLiteral}
    osnova: ${data.osnova ? "true" : "false"}
    attributesJson: ${escapeGraphqlString(attributesJson)}
  }`;
}

const modelFields = `
  id
  name
  description
  category
  access
  attributesJson
`;

const itemFields = `
  id
  inventoryNumber
  operable
  eqModel {
    name
    category
  }
`;

export const equipmentApi = {
  create_model: async (data: CreateEqModelRequestDto) => {
    const inputLiteral = buildEquipmentInputLiteral(data);
    const response = await authenticatedGraphqlRequest<{
      createEquipmentModel: GraphqlEquipmentModel;
    }>(
      `
        mutation CreateEquipmentModel {
          createEquipmentModel(input: ${inputLiteral}) {
            ${modelFields}
          }
        }
      `,
    );

    return mapModel(response.createEquipmentModel);
  },

  get_models_with_items: async () => {
    const response = await graphqlRequest<{
      equipmentModelsWithItems: GraphqlEquipmentModelWithItems[];
    }>(
      `
        query EquipmentModelsWithItems {
          equipmentModelsWithItems {
            ${modelFields}
            items {
              ${itemFields}
            }
          }
        }
      `,
    );

    return response.equipmentModelsWithItems.map((model) => ({
      ...mapModel(model),
      items: model.items.map(mapItem),
    })) as EqModelWithItemsDto[];
  },

  get_all_models: async () => {
    const response = await graphqlRequest<{
      allEquipmentModels: GraphqlEquipmentModel[];
    }>(
      `
        query AllEquipmentModels {
          allEquipmentModels {
            ${modelFields}
          }
        }
      `,
    );

    return response.allEquipmentModels.map(mapModel);
  },

  get_model_by_id: async (id: number) => {
    const response = await graphqlRequest<{
      equipmentModelById: GraphqlEquipmentModel;
    }>(
      `
        query EquipmentModelById($id: Int!) {
          equipmentModelById(id: $id) {
            ${modelFields}
          }
        }
      `,
      { id },
    );

    return mapModel(response.equipmentModelById);
  },

  get_model_by_name: async (name: string) => {
    const response = await graphqlRequest<{
      equipmentModelsByName: GraphqlEquipmentModel[];
    }>(
      `
        query EquipmentModelsByName($name: String!) {
          equipmentModelsByName(name: $name) {
            ${modelFields}
          }
        }
      `,
      { name },
    );

    return response.equipmentModelsByName.map(mapModel);
  },

  get_model_by_category: async (category: EquipmentCategory) => {
    const categoryLiteral = graphqlNamedEnumLiteral(
      EquipmentCategory[category],
      "Other",
    );
    const response = await graphqlRequest<{
      equipmentModelsByCategory: GraphqlEquipmentModel[];
    }>(
      `
        query EquipmentModelsByCategory {
          equipmentModelsByCategory(category: ${categoryLiteral}) {
            ${modelFields}
          }
        }
      `,
    );

    return response.equipmentModelsByCategory.map(mapModel);
  },

  available_models_to_me: async () => {
    const response = await authenticatedGraphqlRequest<{
      availableEquipmentModelsToMe: GraphqlEquipmentModel[];
    }>(
      `
        query AvailableEquipmentModelsToMe {
          availableEquipmentModelsToMe {
            ${modelFields}
          }
        }
      `,
    );

    return response.availableEquipmentModelsToMe.map(mapModel);
  },

  get_available_items_by_model: async (
    modelId: number,
    startIso: string,
    endIso: string,
  ) => {
    const response = await graphqlRequest<{
      availableEquipmentItemsByModel: GraphqlEquipmentItem[];
    }>(
      `
        query AvailableEquipmentItemsByModel(
          $modelId: Int!
          $start: DateTime!
          $end: DateTime!
        ) {
          availableEquipmentItemsByModel(
            modelId: $modelId
            start: $start
            end: $end
          ) {
            ${itemFields}
          }
        }
      `,
      {
        modelId,
        start: startIso,
        end: endIso,
      },
    );

    return response.availableEquipmentItemsByModel.map(mapItem);
  },

  update_model: async (id: number, data: CreateEqModelRequestDto) => {
    const inputLiteral = buildEquipmentInputLiteral(data);
    await authenticatedGraphqlRequest<{
      updateEquipmentModel: GraphqlEquipmentModel;
    }>(
      `
        mutation UpdateEquipmentModel($id: Int!) {
          updateEquipmentModel(id: $id, input: ${inputLiteral}) {
            id
          }
        }
      `,
      {
        id,
      },
    );

    return "Модель оборудования обновлена";
  },

  delete_model: async (id: number) => {
    await authenticatedGraphqlRequest<{ deleteEquipmentModel: boolean }>(
      `
        mutation DeleteEquipmentModel($id: Int!) {
          deleteEquipmentModel(id: $id)
        }
      `,
      { id },
    );

    return "Модель оборудования удалена";
  },

  create_item: async (equipmentModelId: number) => {
    const response = await authenticatedGraphqlRequest<{
      createEquipmentItem: GraphqlEquipmentItem;
    }>(
      `
        mutation CreateEquipmentItem($equipmentModelId: Int!) {
          createEquipmentItem(equipmentModelId: $equipmentModelId) {
            ${itemFields}
          }
        }
      `,
      { equipmentModelId },
    );

    return mapItem(response.createEquipmentItem);
  },

  get_all_items: async () => {
    const response = await graphqlRequest<{
      allEquipmentItems: GraphqlEquipmentItem[];
    }>(
      `
        query AllEquipmentItems {
          allEquipmentItems {
            ${itemFields}
          }
        }
      `,
    );

    return response.allEquipmentItems.map(mapItem);
  },

  get_item_by_id: async (id: number) => {
    const response = await graphqlRequest<{
      equipmentItemById: GraphqlEquipmentItem;
    }>(
      `
        query EquipmentItemById($id: Int!) {
          equipmentItemById(id: $id) {
            ${itemFields}
          }
        }
      `,
      { id },
    );

    return mapItem(response.equipmentItemById);
  },

  get_items_by_model: async (modelId: number) => {
    const response = await graphqlRequest<{
      equipmentItemsByModel: GraphqlEquipmentItem[];
    }>(
      `
        query EquipmentItemsByModel($modelId: Int!) {
          equipmentItemsByModel(modelId: $modelId) {
            ${itemFields}
          }
        }
      `,
      { modelId },
    );

    return response.equipmentItemsByModel.map(mapItem);
  },

  toggle_item_available: async (id: number) => {
    await authenticatedGraphqlRequest<{
      toggleEquipmentItemAvailability: GraphqlEquipmentItem;
    }>(
      `
        mutation ToggleEquipmentItemAvailability($id: Int!) {
          toggleEquipmentItemAvailability(id: $id) {
            id
            operable
          }
        }
      `,
      { id },
    );

    return "Доступность экземпляра обновлена";
  },

  delete_item: async (id: number) => {
    await authenticatedGraphqlRequest<{ deleteEquipmentItem: boolean }>(
      `
        mutation DeleteEquipmentItem($id: Int!) {
          deleteEquipmentItem(id: $id)
        }
      `,
      { id },
    );

    return "Экземпляр оборудования удален";
  },
};
