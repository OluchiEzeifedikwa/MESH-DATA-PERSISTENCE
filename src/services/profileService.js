import axios from 'axios';
import { v7 as uuidv7 } from 'uuid';
import { findByName, create } from '../repositories/profileRepository.js';

function classifyAgeGroup(age) {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
}

async function fetchExternalData(name) {
  const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
    axios.get(`https://api.genderize.io/?name=${encodeURIComponent(name)}`),
    axios.get(`https://api.agify.io/?name=${encodeURIComponent(name)}`),
    axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(name)}`),
  ]);

  return {
    genderData: genderizeRes.data,
    agifyData: agifyRes.data,
    nationalizeData: nationalizeRes.data,
  };
}

function validateExternalData(genderData, agifyData, nationalizeData) {
  if (!genderData.gender || genderData.count === 0) {
    return { valid: false, status: 422, message: 'Unable to determine gender for this name' };
  }
  if (agifyData.age === null || agifyData.age === undefined) {
    return { valid: false, status: 422, message: 'Unable to determine age for this name' };
  }
  if (!nationalizeData.country || nationalizeData.country.length === 0) {
    return { valid: false, status: 422, message: 'Unable to determine nationality for this name' };
  }
  return { valid: true };
}

export async function createProfile(name) {
  const normalizedName = name.trim().toLowerCase();

  // Idempotency check
  const existing = await findByName(normalizedName);
  if (existing) {
    return { alreadyExists: true, profile: existing };
  }

  // Call external APIs
  let genderData, agifyData, nationalizeData;
  try {
    ({ genderData, agifyData, nationalizeData } = await fetchExternalData(normalizedName));
  } catch (err) {
    const error = new Error('Failed to reach external API');
    error.status = 502;
    throw error;
  }

  // Validate API responses
  const validation = validateExternalData(genderData, agifyData, nationalizeData);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.status = validation.status;
    throw error;
  }

  // Aggregate data
  const topCountry = nationalizeData.country.reduce(
    (max, c) => (c.probability > max.probability ? c : max),
    nationalizeData.country[0]
  );

  const profileData = {
    id: uuidv7(),
    name: normalizedName,
    gender: genderData.gender,
    gender_probability: genderData.probability,
    sample_size: genderData.count,
    age: agifyData.age,
    age_group: classifyAgeGroup(agifyData.age),
    country_id: topCountry.country_id,
    country_probability: topCountry.probability,
    created_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };

  const profile = await create(profileData);
  return { alreadyExists: false, profile };
}
