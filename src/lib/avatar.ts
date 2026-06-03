export const getAvatarUrl = (
  login: string,
  role?: string,
  avatarSeed?: string | null,
) => {
  const params = new URLSearchParams({
    seed: avatarSeed || `${login}GUtv 52`,
    size: "128",

    backgroundColor:
      role === "Admin"
        ? "e9d5ff"
        : role === "Osnova"
          ? "fef3c7"
          : role === "Ronin"
            ? "fecaca"
            : "d1ecf1",
  });

  return `https://api.dicebear.com/9.x/bottts-neutral/svg?${params}`;
};
