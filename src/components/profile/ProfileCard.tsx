import { Camera, Check, RefreshCw, X } from "lucide-react";
import type { UserResponseDto } from "@/app/models/user/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAvatarUrl } from "@/lib/avatar";
import { getRoleLabel, hasRoninAccess } from "@/lib/roles";
import styles from "./ProfileLayout.module.css";

export function ProfileCard({
  user,
  onAvatarChange,
  avatarLoading = false,
  showStatus = false,
}: {
  user: UserResponseDto;
  onAvatarChange?: () => void;
  avatarLoading?: boolean;
  showStatus?: boolean;
}) {
  const ronin = hasRoninAccess(user.role);
  return (
    <aside className={styles.card}>
      <div className={styles.brand}>
        <span>GUtv</span>
        <span className={styles.role}>{getRoleLabel(user.role)}</span>
      </div>
      <div className={styles.portrait}>
        <Avatar userRole={user.role} className={styles.avatar}>
          <AvatarImage
            src={getAvatarUrl(
              user.login,
              user.role,
              user.avatarSeed,
              user.avatarUrl,
            )}
            alt={user.name}
          />
          <AvatarFallback>
            {user.name.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {onAvatarChange && (
          <Button
            type="button"
            variant="ghost"
            className={styles.camera}
            onClick={onAvatarChange}
            disabled={avatarLoading}
            aria-label="Изменить аватар"
          >
            <Camera size={16} />
          </Button>
        )}
      </div>
      <h1 className={styles.name}>{user.name}</h1>
      <p className={styles.login}>@{user.login}</p>
      {onAvatarChange && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.avatarButton}
          onClick={onAvatarChange}
          disabled={avatarLoading}
        >
          <RefreshCw
            size={15}
            className={avatarLoading ? "animate-spin" : ""}
          />
          {avatarLoading ? "Сохранение…" : "Изменить аватар"}
        </Button>
      )}
      <div className={styles.permissions}>
        <div className={styles.permissionRow}>
          <span>Разрешение на Ronin</span>
          <span className={ronin ? styles.permissionYes : styles.permissionNo}>
            {ronin ? <Check size={13} /> : <X size={13} />}
            {ronin ? "Да" : "Нет"}
          </span>
        </div>
        {showStatus && (
          <div className={styles.permissionRow}>
            <span>Статус аккаунта</span>
            <span className={user.banned ? styles.permissionNo : styles.active}>
              <span className={styles.statusDot} />
              {user.banned ? "Заблокирован" : "Активен"}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
