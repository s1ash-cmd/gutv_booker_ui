This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Regression tests

```bash
npm test
```

These tests run independent simulated browser tabs against the actual auth API code,
with shared storage, optional Web Locks, and controlled response ordering. They cover
refresh races, login/logout during pending requests, and temporary failures without
calling the backend. The TypeScript compiler writes only to a temporary directory.

Cart tests exercise the actual store with controlled API responses: reads and writes
share one queue, decrements use the latest confirmed quantity, failures do not block
later actions, and old-session responses cannot replace the current cart. Submission
saves validated details and checks out in one queue job.

The form draft lives in the shared cart store and in sessionStorage for the current
login session and tab. It survives navigation and reload, stays intact when equipment
changes, and resets after clear, successful checkout or preparation of another booking
edit. It is sent to the backend when submitting the form.

The calendar query requires the matching backend `CalendarBookingPayload` contract.

## Next.js resources

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Session and equipment regression tests

`npm test` also exercises AuthProvider storage events and stale profile responses,
including account changes, logout, same-account relogin and token refresh. The
provider remounts account-owned state only when the login session changes. Equipment
hook tests cover route changes, empty inventories, range reset and reordered
responses. Booking DTO/API tests ensure every decision submits the viewed revision.

## Сессии нескольких устройств (ветка `test`)

Профиль содержит список активных сессий с браузером/ОС, временем входа,
последнего обновления и сроком действия. Текущий вход отмечен отдельно.
Можно завершить одну сессию или выйти на всех устройствах; массовый выход
требует подтверждения. Список обновляется по кнопке и при возвращении фокуса.

Обычный выход сначала отзывает серверную сессию, затем очищает локальные токены.
При истёкшем access token используется имеющееся обновление токенов. Временная
сетевая ошибка показывается пользователю и не выдаётся за успешный серверный
выход. Запоздавший ответ выхода не очищает токены нового входа. Координация
обновлений между вкладками в одном браузере сохранена.

Требуется сервер из соответствующей ветки `test`: `mySessions`, `logout`,
`revokeMySession` и `logoutAll`. При будущем применении серверной миграции
прежние входы потребуется выполнить заново. Deploy workflow работает только
с `master`; ветка `test` не развёртывается автоматически.

Проверено 4 октября 2026:

- `npm test`: 86 тестов, все успешны, без пропусков. Новые проверки покрывают
  серверный выход, обновление перед выходом, сетевые ошибки, смену аккаунта,
  независимое хранилище устройств, список/отзыв сессий, подтверждение массового
  выхода, фокус, устаревшие ответы и размонтирование.
- `npm run build`: production-сборка и проверка TypeScript успешны.
- `npm run lint`: ошибок нет; четыре ранее существовавших предупреждения `any`.
- В браузере проверен production-интерфейс с настоящими GraphQL resolvers,
  JWT middleware и отдельным PostgreSQL. `localhost` и `127.0.0.1` использовались
  как два независимых хранилища устройств: оба входа сохранялись и обновлялись,
  отзыв одного оставлял второй рабочим, массовый выход завершал оба.

Сервер браузерной проверки содержал только API аккаунта. Остальные разделы
проверялись существующими тестами и сборкой. Продакшен не использовался.

## Профиль и фото (ветка `test`)

Рабочие страницы `/dashboard/profile` и `/dashboard/users/[id]` используют
согласованный вариант 4. Профиль показывает Telegram и реальные серверные
сессии, административная карточка — историю бронирований по 30 записей.

Для выбора и квадратной обрезки фото используется Uppy Dashboard/Image Editor.
Разрешены JPG, PNG и WebP до 5 МБ. Кнопка «Готово» завершает обрезку;
«Применить фото» сохраняет результат на backend. Закрытие окна до применения
сохраняет прежний аватар. Удаление фото возвращает прежнего робота; его можно
заново сгенерировать отдельно. Загруженное фото используется в шапке, меню,
профиле и карточке владельца бронирования. Подсветка ролей сохраняется:
Малыш — голубая, Основа — зелёная, доступ к Ronin — красная,
Администратор — фиолетовая.

Нужен backend `test` с миграцией `20261004101407_AddUserAvatarPhoto`, полем
`User.avatarUrl`, мутациями `uploadMyAvatar` / `removeMyAvatar` и запросом
`bookingsPageByUser`. Относительные `/avatars/...` разрешаются от origin
`NEXT_PUBLIC_API_URL`. Файлы и правила хранения описаны в README backend.

Проверено 4 октября 2026: 90 клиентских тестов, production-сборка и TypeScript
успешны; lint без ошибок, с четырьмя прежними предупреждениями. В браузере
проверены обрезка, отмена, сохранение после перезагрузки, замена и удаление,
общие аватары, все цвета ролей, Telegram без username, страницы истории
30/30/1, светлая/тёмная тема и ширины 320/390 px. Проверка выполнялась
с настоящим API и копией PostgreSQL, без деплоя.
