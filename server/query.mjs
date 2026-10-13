const equal = (a, b) => Array.isArray(a) ? a.includes(b) : a === b;
export function matches(row, query = {}) {
  return Object.entries(query).every(([key, condition]) => {
    if (key === '$or') return condition.some(q => matches(row, q));
    if (key === '$and') return condition.every(q => matches(row, q));
    const value = row[key];
    if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return equal(value, condition);
    return Object.entries(condition).every(([op, target]) => {
      switch (op) {
        case '$in': return target.some(v => equal(value, v));
        case '$nin': return !target.some(v => equal(value, v));
        case '$ne': return !equal(value, target);
        case '$eq': return equal(value, target);
        case '$gt': return value > target;
        case '$gte': return value >= target;
        case '$lt': return value < target;
        case '$lte': return value <= target;
        case '$exists': return target ? value !== undefined : value === undefined;
        case '$options': return true;
        case '$regex': {
          // The app sends escaped literal searches; reject arbitrary regular expressions.
          const literal = String(target).replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
          return condition.$options?.includes('i')
            ? String(value ?? '').toLowerCase().includes(literal.toLowerCase())
            : String(value ?? '').includes(literal);
        }
        default: throw new Error(`Filtro não suportado: ${op}`);
      }
    });
  });
}
export function pageRows(rows, options, legacy = false) {
  const { sort, distinct, fields } = options;
  let result = [...rows];
  if (sort) {
    const field = sort.replace(/^-/, ''), sign = sort.startsWith('-') ? -1 : 1;
    result.sort((a,b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * sign || String(a.id).localeCompare(String(b.id)));
  }
  if (distinct) result = [...new Set(result.flatMap(row => row[distinct] == null ? [] : [row[distinct]]))];
  const skip = Number(options.cursor || options.skip || 0);
  const limit = Math.min(Math.max(Number(options.limit || (legacy ? 100000 : 100)), 1), 100000);
  if (!Number.isSafeInteger(skip) || skip < 0 || !Number.isSafeInteger(limit)) throw new Error('Paginação inválida');
  let items = result.slice(skip, skip + limit);
  if (fields && !distinct) {
    const keys = Array.isArray(fields) ? fields : fields.split(',');
    items = items.map(row => Object.fromEntries(['id', ...keys].filter(k => k in row).map(k => [k, row[k]])));
  }
  return legacy ? items : { items, has_more: skip + limit < result.length, next_cursor: skip + limit < result.length ? String(skip + limit) : null };
}
export function aggregateRows(rows, spec) {
  const fields = typeof spec.groupBy === 'string' ? [spec.groupBy] : spec.groupBy || [];
  const groups = new Map();
  for (const row of rows.filter(r => matches(r, spec.query))) {
    const key = JSON.stringify(fields.map(f => row[f] ?? null));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const result = [...groups.values()].map(group => {
    const row = Object.fromEntries(fields.map(f => [f, group[0][f] ?? null]));
    row.count = group.length;
    for (const op of ['sum', 'max', 'min', 'avg', 'countDistinct']) {
      const keys = spec[op] ? (Array.isArray(spec[op]) ? spec[op] : [spec[op]]) : [];
      for (const key of keys) {
        const values = group.map(r => Number(r[key]) || 0);
        row[`${op === 'countDistinct' ? 'count_distinct' : op}_${key}`] = op === 'countDistinct'
          ? new Set(group.map(r => r[key]).filter(v => v != null)).size
          : op === 'max' ? Math.max(...values) : op === 'min' ? Math.min(...values)
          : values.reduce((a,b) => a+b, 0) / (op === 'avg' ? values.length : 1);
      }
    }
    return row;
  });
  const limit = Math.min(Number(spec.limit || 1000), 10000);
  return { rows: result.slice(0,limit), truncated: result.length > limit };
}
