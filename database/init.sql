-- Cópia fiel da origem: mantém IDs e todos os campos, inclusive os não presentes no schema.
CREATE SCHEMA IF NOT EXISTS base44_import;
CREATE TABLE IF NOT EXISTS base44_import.records (
    entity text NOT NULL,
    id text NOT NULL,
    data jsonb NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (entity, id),
    CHECK (jsonb_typeof(data) = 'object'),
    CHECK (data->>'id' = id)
);
CREATE INDEX IF NOT EXISTS records_data_gin ON base44_import.records USING gin(data);
CREATE TABLE IF NOT EXISTS base44_import.batches (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity text NOT NULL,
    source_file text NOT NULL,
    sha256 text NOT NULL,
    row_count integer NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now()
);
