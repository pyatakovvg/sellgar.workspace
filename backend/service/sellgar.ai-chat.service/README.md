# AI Chat service

Canonical Backend первой версии AI Analytics Assistant.

- HTTP `api/v1` принимает commands и обслуживает initial/demand/recovery queries.
- Socket.IO namespace `/chat` публикует `chat.created`, `chat.updated`,
  `message.created` и `message.updated` после успешного PostgreSQL commit.
- Команды не передаются через Socket.IO; их HTTP response является только ACK.

Скопируйте `.env.example` в `.env`, создайте PostgreSQL database и выполните
`yarn install && yarn start:dev`.

Для ответа AI Backend использует Groq Responses API. Runtime-конфигурация:

```env
GROQ_API_KEY="..."
AI_MODEL="openai/gpt-oss-20b"
```

Groq получает только текстовые `user`/`assistant` сообщения выбранного Chat.
Каноническим владельцем истории остаётся PostgreSQL этого сервиса.
