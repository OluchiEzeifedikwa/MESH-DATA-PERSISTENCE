import { getCountryCode } from './countries.js';

export function parseQuery(q) {
  const query = q.toLowerCase().trim();
  const filters = {};

  // Gender — only set if one gender mentioned, not both
  const hasMale = /\b(male|males|men|man|boy|boys)\b/.test(query);
  const hasFemale = /\b(female|females|women|woman|girl|girls)\b/.test(query);
  if (hasMale && !hasFemale) filters.gender = 'male';
  if (hasFemale && !hasMale) filters.gender = 'female';

  // Age group
  if (/\b(child|children|kids?)\b/.test(query)) filters.age_group = 'child';
  else if (/\b(teen(ager)?s?|teens?)\b/.test(query)) filters.age_group = 'teenager';
  else if (/\b(adult|adults)\b/.test(query)) filters.age_group = 'adult';
  else if (/\b(senior|seniors|elderly)\b/.test(query)) filters.age_group = 'senior';

  // "young" maps to 16–24 (parsing only, not a stored age_group)
  if (/\byoung\b/.test(query)) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  // "above X" / "over X" / "older than X"
  const aboveMatch = query.match(/\b(?:above|over|older than)\s+(\d+)\b/);
  if (aboveMatch) filters.min_age = parseInt(aboveMatch[1]);

  // "below X" / "under X" / "younger than X"
  const belowMatch = query.match(/\b(?:below|under|younger than)\s+(\d+)\b/);
  if (belowMatch) filters.max_age = parseInt(belowMatch[1]);

  // "between X and Y"
  const betweenMatch = query.match(/\bbetween\s+(\d+)\s+and\s+(\d+)\b/);
  if (betweenMatch) {
    filters.min_age = parseInt(betweenMatch[1]);
    filters.max_age = parseInt(betweenMatch[2]);
  }

  // "aged X" / "age X"
  const agedMatch = query.match(/\baged?\s+(\d+)\b/);
  if (agedMatch) {
    filters.min_age = parseInt(agedMatch[1]);
    filters.max_age = parseInt(agedMatch[1]);
  }

  // Country — "from [country name]"
  const fromMatch = query.match(/\bfrom\s+([a-z][a-z\s]+?)(?:\s+(?:above|below|over|under|older|younger|aged?|who|that|with|and)|$)/);
  if (fromMatch) {
    const countryName = fromMatch[1].trim();
    const code = getCountryCode(countryName);
    if (code) filters.country_id = code;
  }

  if (Object.keys(filters).length === 0) return null;

  return filters;
}
