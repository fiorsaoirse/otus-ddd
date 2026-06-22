CREATE TYPE order_status AS ENUM (
    'new',
    'paid',
    'shipped',
    'confirmed',
    'cancelled'
);

CREATE TYPE currency_code AS ENUM (
    'RUB',
    'EUR',
    'USD'
);

CREATE TYPE outbox_status AS ENUM (
    'pending',
    'published',
    'failed'
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    status order_status NOT NULL,
    max_count INTEGER NOT NULL DEFAULT 10,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT orders_id_not_empty CHECK (length(trim(id)) > 0),
    CONSTRAINT orders_customer_id_not_empty CHECK (length(trim(customer_id)) > 0),
    CONSTRAINT orders_max_count_positive CHECK (max_count > 0),
    CONSTRAINT orders_version_positive CHECK (version > 0)
);

CREATE TABLE order_lines (
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_cents BIGINT NOT NULL,
    price_currency currency_code NOT NULL,

    PRIMARY KEY (order_id, product_id),

    CONSTRAINT order_lines_product_id_not_empty CHECK (length(trim(product_id)) > 0),
    CONSTRAINT order_lines_quantity_positive CHECK (quantity > 0),
    CONSTRAINT order_lines_price_cents_non_negative CHECK (price_cents >= 0)
);

CREATE INDEX order_lines_order_id_idx ON order_lines(order_id);
CREATE INDEX orders_customer_id_idx ON orders(customer_id);

CREATE TABLE outbox_messages (
    id TEXT PRIMARY KEY,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    CONSTRAINT outbox_messages_id_not_empty CHECK (length(trim(id)) > 0),
    CONSTRAINT outbox_messages_aggregate_type_not_empty CHECK (length(trim(aggregate_type)) > 0),
    CONSTRAINT outbox_messages_aggregate_id_not_empty CHECK (length(trim(aggregate_id)) > 0),
    CONSTRAINT outbox_messages_event_type_not_empty CHECK (length(trim(event_type)) > 0),
    CONSTRAINT outbox_messages_schema_version_positive CHECK (schema_version > 0),
    CONSTRAINT outbox_messages_attempts_non_negative CHECK (attempts >= 0)
);

CREATE INDEX outbox_messages_pending_idx
    ON outbox_messages(created_at)
    WHERE status = 'pending';

CREATE INDEX outbox_messages_aggregate_idx
    ON outbox_messages(aggregate_type, aggregate_id);
