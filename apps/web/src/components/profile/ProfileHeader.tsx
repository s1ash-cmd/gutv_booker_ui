import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAvatarUrl } from "@/lib/avatar";

export function ProfileHeader({
  user,
  backHref,
  backLabel,
  details,
  action,
}: {
  user: UserResponseDto;
  backHref?: string;
  backLabel?: string;
  /** Extra items appended to the "@login" line. */
  details?: string[];
  action?: ReactNode;
}) {
  const subtitle = [`@${user.login}`, ...(details ?? [])];
  return (
    <header className="mb-8 flex items-center gap-4 sm:gap-5">
      {backHref && (
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={backHref} aria-label={backLabel ?? "Назад"}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
      )}
      <Avatar userRole={user.role} className="size-16 sm:size-20">
        <AvatarImage
          src={getAvatarUrl(
            user.login,
            user.role,
            user.avatarSeed,
            user.avatarUrl,
          )}
          alt={user.name}
        />
        <AvatarFallback className="text-xl sm:text-2xl">
          {user.name.substring(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold sm:text-3xl">{user.name}</h1>
        <p className="mt-0.5 truncate text-sm text-muted-foreground sm:text-base">
          {subtitle.join(" · ")}
        </p>
      </div>
      {action}
    </header>
  );
}
