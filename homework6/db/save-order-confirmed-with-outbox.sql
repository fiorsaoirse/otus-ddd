BEGIN;

-- Save Order aggregate root with optimistic locking and create outbox message
-- only if the aggregate update succeeded.
--
-- Parameters:
-- $1  - orderId
-- $2  - expectedVersion
-- $3  - customerId
-- $4  - maxCount
-- $9  - integration event id
-- $10 - occurredAt
WITH updated_order AS (
    UPDATE orders
    SET
        status = 'confirmed',
        customer_id = $3,
        max_count = $4,
        version = version + 1,
        updated_at = now()
    WHERE id = $1
      AND version = $2
    RETURNING id, customer_id
)
INSERT INTO outbox_messages (
    id,
    aggregate_type,
    aggregate_id,
    event_type,
    schema_version,
    payload
)
SELECT
    $9,
    'Order',
    updated_order.id,
    'orders.order_confirmed',
    1,
    jsonb_build_object(
        'eventId', $9,
        'eventType', 'orders.order_confirmed',
        'schemaVersion', 1,
        'occurredAt', $10,
        'producer', 'orders-service',
        'data', jsonb_build_object(
            'orderId', updated_order.id,
            'customerId', updated_order.customer_id
        )
    )
FROM updated_order;

-- Application code must check affected rows after this INSERT.
-- If affected rows = 0, rollback and throw optimistic lock conflict.
-- If affected rows = 1, continue and commit the transaction.

-- Replace order lines in the same transaction, if aggregate lines changed.
-- This is one possible persistence strategy for an owned collection.
--
-- DELETE FROM order_lines
-- WHERE order_id = $1;
--
-- INSERT INTO order_lines (
--     order_id,
--     product_id,
--     quantity,
--     price_cents,
--     price_currency
-- )
-- VALUES
--     ($1, $5, $6, $7, $8);

COMMIT;
