BEGIN;
SELECT pg_advisory_xact_lock(hashtext('Usuario'));
CREATE TABLE IF NOT EXISTS kartvicio.usuario_dedup_backup (
 id text PRIMARY KEY, data jsonb NOT NULL, archived_at timestamptz NOT NULL DEFAULT now()
);
-- Match the server's existing effective record (ORDER BY id); preserve its permissions.
CREATE TEMP TABLE duplicate_users ON COMMIT DROP AS
SELECT id, data, row_number() OVER (PARTITION BY lower(trim(data->>'email')) ORDER BY id) AS ordinal
FROM kartvicio.records WHERE entity='Usuario' AND coalesce(trim(data->>'email'),'')<>'';
INSERT INTO kartvicio.usuario_dedup_backup(id,data)
SELECT id,data FROM duplicate_users WHERE ordinal>1 ON CONFLICT DO NOTHING;
DELETE FROM kartvicio.records r USING duplicate_users d
WHERE r.entity='Usuario' AND r.id=d.id AND d.ordinal>1;
UPDATE kartvicio.records SET data=jsonb_set(data,'{email}',to_jsonb(lower(trim(data->>'email'))))
WHERE entity='Usuario' AND coalesce(trim(data->>'email'),'')<>'';
CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_unique ON kartvicio.records(lower(trim(data->>'email')))
WHERE entity='Usuario' AND coalesce(trim(data->>'email'),'')<>'';
COMMIT;
SELECT count(*) AS usuarios_restantes FROM kartvicio.records WHERE entity='Usuario';
