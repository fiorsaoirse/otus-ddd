BEGIN;

-- 1. Обработка должна происходить небольшими батчами, берется набор сообщений в статусе pending
-- и на них навешивается lock, чтобы другие обработчики не обрабатывали тот же набор сообщений.
-- При этом пропускаются сообщения, которые уже были заблокированы другими обработчиками.
WITH batch AS (
    SELECT id
    FROM outbox_messages
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
)
UPDATE outbox_messages AS outbox
SET
    locked_at = now(),
    attempts = attempts + 1
FROM batch
WHERE outbox.id = batch.id
RETURNING
    outbox.id,
    outbox.event_type,
    outbox.payload;

COMMIT;

-- 2. Публикация в слое Application в брокер
--
-- for message in batch:
--   broker.publish(
--     topic = message.event_type,
--     key = message.payload.data.orderId,
--     value = message.payload
--   )

-- 3a. Если удалось опубликовать сообщения, меняем статус
UPDATE outbox_messages
SET
    status = 'published',
    published_at = now(),
    last_error = NULL
WHERE id = $1;

-- 3b. Если не удалось, оставляем для retry или помечаем как failed в случае превышения количества попыток
UPDATE outbox_messages
SET
    status = CASE
        WHEN attempts >= 10 THEN 'failed'::outbox_status
        ELSE 'pending'::outbox_status
    END,
    locked_at = NULL,
    last_error = $2
WHERE id = $1;
