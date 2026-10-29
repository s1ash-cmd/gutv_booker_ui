import {
  Aperture,
  Battery,
  Camera,
  createLucideIcon,
  type LucideIcon,
  Mic,
  PlugZap,
  Shapes,
  Zap,
} from "lucide-react";
import { EquipmentCategory } from "@/app/models/equipment/equipment";

export const categoryIcons: Record<EquipmentCategory, LucideIcon> = {
  [EquipmentCategory.Camera]: Camera,
  [EquipmentCategory.Lens]: Aperture,
  [EquipmentCategory.Card]: createLucideIcon("SdCard", [
    [
      "path",
      {
        d: "M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z",
        key: "outline",
      },
    ],
    ["path", { d: "M8 5.5V9m3-3.5V9m3-3.5V9M8 15h8M8 18h5", key: "contacts" }],
  ]),
  [EquipmentCategory.Battery]: Battery,
  [EquipmentCategory.Charger]: PlugZap,
  [EquipmentCategory.Sound]: Mic,
  [EquipmentCategory.Stand]: createLucideIcon("Tripod", [
    [
      "path",
      {
        d: "M12 9v12M12 9 4 21M12 9l8 12M8 9h8V5H8zM12 5V2",
        key: "tripod",
      },
    ],
  ]),
  [EquipmentCategory.Light]: Zap,
  [EquipmentCategory.Filters]: createLucideIcon("OpticalFilters", [
    ["circle", { cx: "10", cy: "10", r: "7", key: "front" }],
    ["path", { d: "M17 8a7 7 0 1 1-9 9M7 11l4-4", key: "rear-and-glass" }],
  ]),
  [EquipmentCategory.Other]: Shapes,
};
