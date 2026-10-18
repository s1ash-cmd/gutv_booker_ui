import type { CSSProperties } from "react";
import { getApiResourceUrl } from "./api";

const roleColors: Record<string, { background: string; glow: string }> = {
  User: { background: "d1ecf1", glow: "#38bdf8" },
  Osnova: { background: "fef3c7", glow: "#22c55e" },
  Ronin: { background: "fecaca", glow: "#f87171" },
  Admin: { background: "e9d5ff", glow: "#a855f7" },
};

export function getAvatarGlowStyle(
  role?: string | null,
): CSSProperties & { "--avatar-glow-color": string } {
  return {
    "--avatar-glow-color": (roleColors[role ?? ""] ?? roleColors.User).glow,
  };
}

export const getAvatarUrl = (
  login: string,
  role?: string,
  avatarSeed?: string | null,
  avatarUrl?: string | null,
) => {
  if (avatarUrl) return getApiResourceUrl(avatarUrl);
  const params = new URLSearchParams({
    seed: avatarSeed || `${login}GUtv 52`,
    size: "128",
    backgroundColor: (roleColors[role ?? ""] ?? roleColors.User).background,
  });
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?${params}`;
};
