import { ArrowUpRight, Bell, ChevronDown, Send } from "lucide-react";
import type { ReactNode } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import styles from "./ProfileLayout.module.css";

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
  return (
    <section className={styles.panel} aria-label="Telegram">
      <div className={styles.sectionTitle}>
        <h2>Telegram</h2>
        <Bell size={19} className={styles.secondary} />
      </div>
      <div className={styles.telegram}>
        <div className={styles.telegramIcon}>
          <Send size={22} />
        </div>
        <div className={styles.grow}>
          <p className={styles.itemTitle}>
            {linked
              ? user.telegramUsername
                ? `@${user.telegramUsername}`
                : "Telegram подключён"
              : ownProfile
                ? "Подключите Telegram"
                : "Telegram не подключён"}
          </p>
          <p className={styles.secondary}>
            {linked
              ? ownProfile
                ? "Статусы бронирований приходят в бот"
                : "Пользователь получает уведомления в бот"
              : ownProfile
                ? "Получайте уведомления о своих бронированиях"
                : "Уведомления о бронированиях недоступны"}
          </p>
        </div>
        {action ??
          (linked && user.telegramUsername && (
            <a
              href={`https://t.me/${user.telegramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.simpleLink}
            >
              Написать <ArrowUpRight size={14} />
            </a>
          ))}
      </div>
      {linked && (
        <details className={styles.technical}>
          <summary>
            Данные подключения <ChevronDown size={14} />
          </summary>
          <dl>
            <dt>Telegram username</dt>
            <dd>
              {user.telegramUsername
                ? `@${user.telegramUsername}`
                : "Не указан"}
            </dd>
            <dt>Telegram Chat ID</dt>
            <dd>{user.telegramChatId ?? "—"}</dd>
          </dl>
        </details>
      )}
    </section>
  );
}
