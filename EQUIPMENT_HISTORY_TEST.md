# Локальная проверка истории экземпляра

Ветка `test-equipment-history` в обоих репозиториях. Рабочие каталоги:

- UI: `.prototypes/equipment-history-test`
- API: `.prototypes/equipment-history-api-test`

Страница: <http://localhost:3112/equipment/1>.

Локальные аккаунты: `history-admin` (Admin) и `history-member` (User).
Пароль обоих тестовых аккаунтов: `LocalHistory2026!`.
Эти аккаунты существуют только в отдельной локальной базе.

## Поведение

История встроена в существующий блок экземпляров. Нажатие на всю строку экземпляра
выбирает его; кнопки исправности и удаления сохраняют свои отдельные действия.
Удаление доступно только для последнего экземпляра, с существующим подтверждением.
Весь ряд бронирования открывает существующую страницу брони.

Журнал показывает пользователя, цель, период использования именно этого экземпляра,
статус и возврат. Отменённые бронирования включены. Поиск, фильтр статуса и страницы
используют компоненты и размеры основного сайта. На телефоне строки перестраиваются
без горизонтальной прокрутки. Используется `#`, светлая и тёмная темы сайта.

Обычному пользователю журнал и элементы выбора не показываются, запрос истории не
выполняется. GraphQL-запрос `bookingsByEquipmentItem` защищён ролью Admin на сервере.
Для экземпляра без бронирований сервер возвращает пустой список.

Фотографии, проверка доступности, характеристики, статистика, доступ,
рекомендации, управление моделью и добавление в корзину остаются на исходной странице.

## Локальный запуск

Используется отдельный PostgreSQL на `127.0.0.1:55439`, база
`GUtv_equipment_history_local`, пользователь `gutv_history_local`.
Данные скопированы из локальной базы для просмотра существующего оборудования.
Каталог PostgreSQL: `/tmp/gutv-equipment-history-pg`.
Оригинальная база и основные рабочие каталоги не изменены.

При необходимости запустить остановленный PostgreSQL:

```sh
pg_ctl -D /tmp/gutv-equipment-history-pg \
  -l /tmp/gutv-equipment-history-pg.log \
  -o '-h 127.0.0.1 -p 55439 -k /tmp/gutv-equipment-history-pg' start
```

В каталоге API:

```sh
ConnectionStrings__DefaultConnection='Host=127.0.0.1;Port=55439;Database=GUtv_equipment_history_local;Username=gutv_history_local' \
Jwt__Key='LOCAL_HISTORY_TEST_KEY_NOT_FOR_PRODUCTION_2026_10_06' \
Jwt__Issuer='gutv-history-local' \
Jwt__Audience='gutv-history-local' \
BotConfiguration__BotToken='123456:LOCAL_HISTORY_TEST_TOKEN_NO_REAL_BOT' \
BotConfiguration__Enabled=false \
ASPNETCORE_ENVIRONMENT=Development \
ASPNETCORE_URLS=http://127.0.0.1:5148 \
AvatarStorage__Path=/tmp/gutv-history-avatars \
EquipmentPhotoStorage__Path=/tmp/gutv-history-photos \
dotnet run --no-launch-profile
```

Telegram-обработчики отключены для локальной проверки. По умолчанию в API они
продолжают запускаться. Фотографии скопированы в `/tmp/gutv-history-photos`.

В каталоге UI:

```sh
NEXT_PUBLIC_API_URL=http://localhost:5148 \
npm run dev -- --hostname 127.0.0.1 --port 3112 --webpack
```

Текущие логи: `/tmp/gutv-equipment-history-ui.log` и
`/tmp/gutv-equipment-history-api.log`.

## Дизайн

Основа — существующая страница и её компоненты. При исследовании использованы
[рекомендации Carbon по таблицам](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines)
и [пример журнала в контексте инвентаря](https://www.mashalevine.com/inventory).
Взяты компактная плотность, выделение строки при наведении и отдельные действия
над экземпляром. Новая визуальная система не вводится.

## Проверки

- TypeScript и Biome для изменённых файлов — успешно.
- UI: 94 теста — успешно.
- API: 200 тестов — успешно; 10 существующих PostgreSQL-тестов пропущены
  без настройки их отдельного интеграционного окружения.
- Добавлены проверки пустой истории, включения отменённых бронирований
  и ограничения истории выбранным экземпляром.
- На работающем API проверены Admin, User и анонимный запрос:
  история разрешена только Admin.
- В браузере проверены выбор экземпляра, исправность, создание/удаление,
  пустая история, поиск/статус/страницы, переход в бронь, существующие формы,
  скрытие истории и отсутствие запроса у User.
- Проверены ширины 375, 640, 768 и 1280 px, обе темы; горизонтального
  переполнения страницы нет.
