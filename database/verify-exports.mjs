import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.resolve(process.argv[2] || path.join(root, 'private-data'));
const entities = fs.readdirSync(path.join(root, 'base44/entities'))
  .filter(name => name.endsWith('.jsonc')).map(name => name.replace(/\.jsonc$/, ''));
const report = { checkedAt: new Date().toISOString(), complete: true, entities: [], errors: [] };
const datasets = new Map();
for (const entity of entities) {
  const file = path.join(directory, `${entity}.json`);
  if (!fs.existsSync(file)) {
    report.errors.push(`${entity}: exportação ausente`);
    continue;
  }
  try {
    const bytes = fs.readFileSync(file);
    const rows = JSON.parse(bytes.toString('utf8'));
    if (!Array.isArray(rows)) throw new Error('esperado array JSON');
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !row.id.trim()) throw new Error('registro sem ID');
      if (ids.has(row.id)) throw new Error(`ID duplicado ${row.id}`);
      ids.add(row.id);
    }
    datasets.set(entity, { rows, ids });
    report.entities.push({ entity, count: rows.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  } catch (error) { report.errors.push(`${entity}: ${error.message}`); }
}
// Referências explícitas por ID; nomes de pilotos exigem conferência separada.
const references = { campeonato_id: 'Campeonato', etapa_id: 'Etapa', piloto_id: 'Piloto' };
for (const [entity, { rows }] of datasets) {
  for (const row of rows) {
    for (const [field, target] of Object.entries(references)) {
      if (row[field] && datasets.has(target) && !datasets.get(target).ids.has(row[field])) {
        report.errors.push(`${entity}/${row.id}: ${field} sem correspondente em ${target}`);
      }
    }
  }
}
report.complete = report.errors.length === 0;
console.log(JSON.stringify(report, null, 2));
if (!report.complete) process.exitCode = 1;
