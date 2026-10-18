export function isAdminRole(role?: string | null) {
  return role === "Admin";
}

export function hasRoninAccess(role?: string | null) {
  return role === "Ronin" || role === "Admin";
}

export function canBookEquipment(role?: string | null) {
  return (
    role === "User" || role === "Osnova" || role === "Ronin" || role === "Admin"
  );
}

export function getRoleLabel(role?: string | null) {
  switch (role) {
    case "Admin":
      return "Администратор";
    case "Ronin":
      return "Основа";
    case "Osnova":
      return "Основа";
    default:
      return "Малыш";
  }
}
