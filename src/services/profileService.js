import axios from 'axios';
import { v7 as uuidv7 } from 'uuid';
import { findByName, findById, findAll, findCount, create, deleteById, findAllUnpaginated } from '../repositories/profileRepository.js';
import { getCountryName } from '../utils/countries.js';

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
    return { valid: false, status: 502, message: 'Genderize returned an invalid response' };
  }
  if (agifyData.age === null || agifyData.age === undefined) {
    return { valid: false, status: 502, message: 'Agify returned an invalid response' };
  }
  if (!nationalizeData.country || nationalizeData.country.length === 0) {
    return { valid: false, status: 502, message: 'Nationalize returned an invalid response' };
  }
  return { valid: true };
}

export async function createProfile(name) {
  const normalizedName = name.trim().toLowerCase();

  const existing = await findByName(normalizedName);
  if (existing) {
    return { alreadyExists: true, profile: existing };
  }

  let genderData, agifyData, nationalizeData;
  try {
    ({ genderData, agifyData, nationalizeData } = await fetchExternalData(normalizedName));
  } catch (err) {
    const error = new Error('Failed to reach external API');
    error.status = 502;
    throw error;
  }

  const validation = validateExternalData(genderData, agifyData, nationalizeData);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.status = validation.status;
    throw error;
  }

  // extract
  const countries = nationalizeData.country;
  const age = agifyData.age;
  const gender = genderData.gender;
  const gender_probability = genderData.probability;

  // process
  const topCountry = countries.reduce(
    (max, c) => (c.probability > max.probability ? c : max),
    countries[0]
  );
  const age_group = classifyAgeGroup(age);
  const country_name = getCountryName(topCountry.country_id);

  const profileData = {
    id: uuidv7(),
    name: normalizedName,
    gender,
    gender_probability,
    age,
    age_group,
    country_id: topCountry.country_id,
    country_name,
    country_probability: topCountry.probability,
  };

  const profile = await create(profileData);
  return { alreadyExists: false, profile };
}

export async function getProfileById(id) {
  const profile = await findById(id);
  if (!profile) {
    const error = new Error('Profile not found');
    error.status = 404;
    throw error;
  }
  return profile;
}

export async function getProfiles(options) {
  const [profiles, total] = await Promise.all([
    findAll(options),
    findCount(options.filters),
  ]);
  return { profiles, total };
}

export async function deleteProfile(id) {
  const profile = await findById(id);
  if (!profile) {
    const error = new Error('Profile not found');
    error.status = 404;
    throw error;
  }
  await deleteById(id);
}

export async function exportAllProfiles(options) {
  return findAllUnpaginated(options);
}
