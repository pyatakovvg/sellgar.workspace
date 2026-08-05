# AI Chat backend service

## Назначение

`@service/ai-chat` является canonical Backend первой версии AI Analytics
Assistant. Сервис владеет PostgreSQL state, HTTP commands/queries и Socket.IO
canonical mutation events.

## Границы

- HTTP command возвращает только `202 Accepted`.
- Canonical Chat/Message приходит клиенту отдельным Socket.IO event после
  успешного database commit.
- Одна мутация одной entity публикуется отдельным `chat.created`,
  `chat.updated`, `message.created` или `message.updated`.
- Controller выполняет transport validation и вызывает service.
- Service владеет use case, transaction и публикацией результата после commit.
- Repository выполняет только TypeORM/PostgreSQL operations.
- Socket.IO не принимает client commands.
- Авторизация, RMQ, migration и compatibility models не добавляются без
  отдельного решения.

## Проверка

```bash
yarn test
yarn build
```

Integration smoke требует PostgreSQL из `.env` и клиента Socket.IO namespace
`/chat`.
