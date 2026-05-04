const NUMERIC_KEYS = ['min_age', 'max_age', 'min_gender_probability', 'min_country_probability'];
const ALLOWED_KEYS = ['gender', 'age_group', 'country_id', ...NUMERIC_KEYS];

// Converts a raw filter object into a canonical form so that two queries expressing
// the same intent always produce the same cache key.
// - Keys are processed in a fixed order (no key-order variance)
// - String values are lowercased (no case variance)
// - Numeric values are cast to Number (no type variance)
// - Missing or empty values are excluded
export function normalizeFilters(filters = {}) {
  const normalized = {};
  for (const key of ALLOWED_KEYS) {
    const val = filters[key];
    if (val === undefined || val === null || val === '') continue;
    normalized[key] = NUMERIC_KEYS.includes(key) ? Number(val) : String(val).toLowerCase();
  }
  return normalized;
}

// Produces a stable JSON string cache key from normalised filters, sort, and pagination.
// All three dimensions are included so page 1 and page 2 of the same query are cached separately.
export function makeCacheKey(normalized, sort = {}, pagination = {}) {
  const sortKey = sort.sort_by || 'created_at';
  const orderKey = sort.order || 'asc';
  const pageKey = pagination.page || 1;
  const limitKey = pagination.limit || 10;
  return JSON.stringify({ filters: normalized, sort: { sort_by: sortKey, order: orderKey }, pagination: { page: pageKey, limit: limitKey } });
}
