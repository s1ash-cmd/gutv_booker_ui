import {
  type EqModelResponseDto,
  EquipmentCategory,
} from "@/app/models/equipment/equipment";

const complementaryCategories: Record<EquipmentCategory, EquipmentCategory[]> =
  {
    [EquipmentCategory.Camera]: [
      EquipmentCategory.Lens,
      EquipmentCategory.Card,
      EquipmentCategory.Battery,
      EquipmentCategory.Stand,
      EquipmentCategory.Sound,
      EquipmentCategory.Light,
    ],
    [EquipmentCategory.Lens]: [
      EquipmentCategory.Camera,
      EquipmentCategory.Stand,
      EquipmentCategory.Light,
    ],
    [EquipmentCategory.Card]: [EquipmentCategory.Camera],
    [EquipmentCategory.Battery]: [
      EquipmentCategory.Camera,
      EquipmentCategory.Light,
      EquipmentCategory.Sound,
    ],
    [EquipmentCategory.Charger]: [
      EquipmentCategory.Battery,
      EquipmentCategory.Camera,
    ],
    [EquipmentCategory.Sound]: [
      EquipmentCategory.Camera,
      EquipmentCategory.Stand,
      EquipmentCategory.Battery,
    ],
    [EquipmentCategory.Stand]: [
      EquipmentCategory.Camera,
      EquipmentCategory.Light,
      EquipmentCategory.Sound,
    ],
    [EquipmentCategory.Light]: [
      EquipmentCategory.Stand,
      EquipmentCategory.Battery,
      EquipmentCategory.Camera,
    ],
    [EquipmentCategory.Other]: [
      EquipmentCategory.Camera,
      EquipmentCategory.Stand,
  ],
  [EquipmentCategory.Filters]: [
    EquipmentCategory.Lens,
    ]
  };

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getCompatibilityTokens(model: EqModelResponseDto) {
  return [
    normalize(model.name),
    ...Object.values(model.attributes).map(normalize),
  ]
    .join(" ")
    .split(/[\s,/;-]+/)
    .filter((token) => token.length > 2);
}

function scoreRecommendation(
  source: EqModelResponseDto,
  candidate: EqModelResponseDto,
) {
  const categories = complementaryCategories[source.category] ?? [];
  const categoryIndex = categories.indexOf(candidate.category);

  if (categoryIndex === -1 || source.id === candidate.id) {
    return 0;
  }

  const sourceTokens = new Set(getCompatibilityTokens(source));
  const candidateTokens = getCompatibilityTokens(candidate);
  const tokenMatches = candidateTokens.filter((token) =>
    sourceTokens.has(token),
  ).length;

  return 100 - categoryIndex * 10 + tokenMatches * 6;
}

export function getEquipmentRecommendations(
  source: EqModelResponseDto,
  models: EqModelResponseDto[],
  limit = 3,
) {
  return models
    .map((model) => ({
      model,
      score: scoreRecommendation(source, model),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.model.name.localeCompare(b.model.name),
    )
    .slice(0, limit)
    .map((item) => item.model);
}
