import type { NextRequest } from "next/server";
import { UserRole } from "@/app/models/user/user";
import { authService } from "@/lib/auth";

export async function getUserFromToken(request: NextRequest) {
  const token = request.headers.get("authorization")?.split(" ")[1];

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    const payload = await authService.verifyToken(token);

    // Convert role string back to enum for legacy compatibility
    const roleString = payload.role as string;
    const roleEnum = UserRole[
      roleString as keyof typeof UserRole
    ] as unknown as number;

    return {
      id: parseInt(payload.sub, 10),
      role: roleEnum,
      roleName: roleString,
      login: payload.login,
      name: payload.name,
    };
  } catch (error: any) {
    console.error("Token verification error:", error.message || error);
    throw new Error("Invalid token");
  }
}

export async function getUserIdFromToken(
  request: NextRequest,
): Promise<number> {
  const user = await getUserFromToken(request);
  return user.id;
}

export async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const user = await getUserFromToken(request);
    return user.roleName === "Admin";
  } catch {
    return false;
  }
}

export function requireRole(userRole: number, requiredRole: UserRole) {
  if (userRole < requiredRole) {
    throw new Error("Forbidden");
  }
}
