"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type * as React from "react";

import { getAvatarGlowStyle } from "@/lib/avatar";
import { cn } from "@/lib/utils";

function Avatar({
  className,
  userRole,
  style,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  userRole?: string | null;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-avatar-role={userRole}
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        userRole !== undefined && "avatar-role-glow",
        className,
      )}
      style={{
        ...(userRole !== undefined ? getAvatarGlowStyle(userRole) : {}),
        ...style,
      }}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
