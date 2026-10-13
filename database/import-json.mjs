import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Uso: node database/import-json.mjs Entidade private-data/Entidade.json
// Importa uma exportação completa em transação; nenhuma chamada à origem é feita.
const [entity, filename] = process.argv.slice(2);
const root = path.resolve(import.meta.dirname, '..');
if (!entity || !filename || !/^[A-Za-z]+$/.test(entity) ||
    !fs.existsSync(path.join(root, 'base44/entities', `${entity}.jsonc`))) {
  throw new Error('Informe uma entidade existente e um arquivo JSON exportado.');
}
const bytes = fs.readFileSync(path.resolve(filename));
const rows = JSON.parse(bytes.toString('utf8'));
if (!Array.isArray(rows)) throw new Error('A exportação deve ser um array completo de registros.');
const ids = new Set();
for (const row of rows) {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id.trim()) {
    throw new Error('Registro sem ID válido: importação cancelada.');
  }
  if (ids.has(row.id)) throw new Error(`ID duplicado: ${row.id}`);
  ids.add(row.id);
}
const literal = value => "'" + value.replaceAll("'", "''") + "'";
const digest = crypto.createHash('sha256').update(bytes).digest('hex');
const statements = rows.map(row => `INSERT INTO base44_import.records(entity,id,data)
VALUES (${literal(entity)},${literal(row.id)},${literal(JSON.stringify(row))}::jsonb)
ON CONFLICT(entity,id) DO UPDATE SET data=excluded.data,imported_at=now();`);
const sql = `BEGIN;\nSET LOCAL standard_conforming_strings=on;\n${statements.join('\n')}
INSERT INTO base44_import.batches(entity,source_file,sha256,row_count)
VALUES (${literal(entity)},${literal(path.basename(filename))},${literal(digest)},${rows.length});
COMMIT;
SELECT entity,count(*) AS registros FROM base44_import.records
WHERE entity=${literal(entity)} GROUP BY entity;`;
const result = spawnSync('docker', ['compose', 'exec', '-T', 'db', 'psql',
  '-U', 'kartvicio', '-d', 'kartvicio', '-v', 'ON_ERROR_STOP=1', '-q'], {
  cwd: root, input: sql, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
});
if (result.error) throw result.error;
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(result.status || 1);
}
console.log(result.stdout.trim());
console.log(`Importados ${rows.length} registros. SHA256: ${digest}`);
