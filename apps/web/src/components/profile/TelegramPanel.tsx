import { ArrowUpRight, Hash, Send } from "lucide-react";
import type { ReactNode } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import {
  ProfileRow,
  ProfileSection,
} from "@/components/profile/ProfileSection";
import { Button } from "@/components/ui/button";

export function TelegramPanel({
  user,
  action,
  ownProfile = false,
}: {
  user: UserResponseDto;
  action?: ReactNode;
  ownProfile?: boolean;
}) {
  const linked = user.isTelegramLinked;
  const username = user.telegramUsername;
  return (
    <ProfileSection title="Уведомления">
      <ProfileRow
        icon={<Send />}
        label="Telegram"
        value={
          linked
            ? username
              ? `@${username}`
              : "Подключён"
            : ownProfile
              ? "Не подключён — уведомления не приходят"
              : "Не подключён"
        }
        action={
          action ??
          (linked && username && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <a
                href={`https://t.me/${username}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Написать <ArrowUpRight className="size-3.5" />
              </a>
            </Button>
          ))
        }
      />
      {linked && !ownProfile && (
        <ProfileRow
          icon={<Hash />}
          label="Chat ID"
          value={
            <span className="font-mono">{user.telegramChatId ?? "—"}</span>
          }
        />
      )}
    </ProfileSection>
  );
}
