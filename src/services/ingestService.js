import csvParser from 'csv-parser';
import { v7 as uuidv7 } from 'uuid';
import { bulkCreate } from '../repositories/profileRepository.js';
import { getCountryName } from '../utils/countries.js';

// Accepted gender values — anything else is treated as invalid and skipped
const VALID_GENDERS = new Set(['male', 'female']);

// Number of valid rows collected before a bulk insert is triggered.
// Keeps memory usage constant regardless of file size.
const CHUNK_SIZE = 500;

function classifyAgeGroup(age) {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
}

// Validates a single CSV row. Returns { valid: true, data } on success
// or { valid: false, reason } so the caller can track why the row was skipped.
function validateRow(row) {
  const name = row.name?.trim().toLowerCase();
  const gender = row.gender?.trim().toLowerCase();
  const age = Number(row.age);
  const country_id = row.country_id?.trim().toUpperCase();

  if (!name || !gender || !row.age || !country_id) {
    return { valid: false, reason: 'missing_fields' };
  }
  if (!VALID_GENDERS.has(gender)) {
    return { valid: false, reason: 'invalid_gender' };
  }
  if (!Number.isInteger(age) || age <= 0) {
    return { valid: false, reason: 'invalid_age' };
  }

  return {
    valid: true,
    data: {
      id: uuidv7(),
      name,
      gender,
      gender_probability: Number(row.gender_probability) || 0,
      age,
      age_group: row.age_group?.trim() || classifyAgeGroup(age),
      country_id,
      country_name: row.country_name?.trim() || getCountryName(country_id) || country_id,
      country_probability: Number(row.country_probability) || 0,
    },
  };
}

// Streams a CSV file through csv-parser, validates each row, batches valid rows,
// and bulk inserts each batch. A single bad row never fails the entire upload.
// Duplicate names are silently skipped by the database (skipDuplicates: true).
export async function ingestCSV(fileStream) {
  const stats = {
    total_rows: 0,
    inserted: 0,
    skipped: 0,
    reasons: { duplicate_name: 0, invalid_age: 0, missing_fields: 0, invalid_gender: 0, malformed_row: 0 },
  };

  const batch = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    const result = await bulkCreate(batch);
    const duplicates = batch.length - result.count;
    stats.inserted += result.count;
    stats.skipped += duplicates;
    stats.reasons.duplicate_name += duplicates;
    batch.length = 0;
  }

  await new Promise((resolve, reject) => {
    fileStream.on('error', reject);

    fileStream
      .pipe(csvParser())
      .on('data', (row) => {
        stats.total_rows++;
        const validation = validateRow(row);
        if (!validation.valid) {
          stats.skipped++;
          stats.reasons[validation.reason] = (stats.reasons[validation.reason] || 0) + 1;
          return;
        }
        batch.push(validation.data);
        if (batch.length >= CHUNK_SIZE) {
          fileStream.pause();
          flushBatch().then(() => fileStream.resume()).catch(reject);
        }
      })
      .on('error', () => {
        stats.total_rows++;
        stats.skipped++;
        stats.reasons.malformed_row++;
      })
      .on('end', () => {
        flushBatch().then(resolve).catch(reject);
      });
  });

  return stats;
}
