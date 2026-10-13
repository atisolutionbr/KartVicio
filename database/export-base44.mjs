import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@base44/sdk';
const root = path.resolve(import.meta.dirname, '..');
process.loadEnvFile(path.join(root, '.env'));
const client = createClient({ appId: '68af8b4414dd5072425cde4e', headers: { Authorization: `Bearer ${process.env.BASE44_ACCESS_TOKEN}` } });
const directory = path.join(root, 'private-data');
await fs.mkdir(directory, { recursive: true });
const entities = process.argv.slice(2).length ? process.argv.slice(2) : (await fs.readdir(path.join(root, 'base44/entities'))).filter(f => f.endsWith('.jsonc')).map(f => f.slice(0,-6));
for (const entity of entities) {
  try {
    const expected = await client.entities[entity].count();
    const rows = [], seen = new Set();
    let cursor;
    do {
      const page = await client.entities[entity].list({ limit: 100, cursor });
      if (!Array.isArray(page.items)) throw new Error('Formato de página inesperado');
      for (const row of page.items) {
        if (seen.has(row.id)) throw new Error('ID repetido durante paginação');
        seen.add(row.id); rows.push(row);
      }
      const next = page.has_more ? page.next_cursor : undefined;
      if (page.has_more && (!next || next === cursor)) throw new Error('Cursor inválido');
      cursor = next;
    } while (cursor);
    if (rows.length !== expected) throw new Error(`Contagem divergente: ${rows.length}/${expected}`);
    await fs.writeFile(path.join(directory, `${entity}.json`), JSON.stringify(rows, null, 2));
    console.log(`${entity}: ${rows.length}/${expected}`);
  } catch (error) {
    console.error(`${entity}: falha na exportação (${error.status || error.response?.status || error.code || 'erro'}).`);
    process.exitCode = 1; break;
  }
}
