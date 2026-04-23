import { createProfile, getProfileById, getProfiles, deleteProfile } from '../services/profileService.js';
import { parseQuery } from '../utils/queryParser.js';

function formatProfile(profile) {
  return {
    ...profile,
    created_at: profile.created_at instanceof Date
      ? profile.created_at.toISOString().replace(/\.\d{3}Z$/, 'Z')
      : profile.created_at,
  };
}

export async function createProfileHandler(req, res) {
  const { name } = req.body;

  if (name === undefined || name === null || name === '') {
    return res.status(400).json({ status: 'error', message: 'Name is required' });
  }

  if (typeof name !== 'string') {
    return res.status(422).json({ status: 'error', message: 'Name must be a string' });
  }

  if (!name.trim()) {
    return res.status(400).json({ status: 'error', message: 'Name cannot be empty' });
  }

  try {
    const { alreadyExists, profile } = await createProfile(name);

    if (alreadyExists) {
      return res.status(200).json({
        status: 'success',
        message: 'Profile already exists',
        data: formatProfile(profile),
      });
    }

    return res.status(201).json({
      status: 'success',
      data: formatProfile(profile),
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ status: 'error', message });
  }
}

export async function getProfileByIdHandler(req, res) {
  try {
    const profile = await getProfileById(req.params.id);
    return res.status(200).json({ status: 'success', data: formatProfile(profile) });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ status: 'error', message });
  }
}

export async function getProfilesHandler(req, res) {
  const {
    gender, age_group, country_id,
    min_age, max_age, min_gender_probability, min_country_probability,
    sort_by, order, page, limit,
  } = req.query;

  const ALLOWED_SORT = ['age', 'created_at', 'gender_probability'];
  const ALLOWED_ORDER = ['asc', 'desc'];

  if (sort_by && !ALLOWED_SORT.includes(sort_by)) {
    return res.status(400).json({ status: 'error', message: 'Invalid query parameters' });
  }
  if (order && !ALLOWED_ORDER.includes(order)) {
    return res.status(400).json({ status: 'error', message: 'Invalid query parameters' });
  }

  const numericParams = { min_age, max_age, min_gender_probability, min_country_probability };
  for (const val of Object.values(numericParams)) {
    if (val !== undefined && val !== '' && isNaN(Number(val))) {
      return res.status(400).json({ status: 'error', message: 'Invalid query parameters' });
    }
  }

  const parsedPage = parseInt(page) || 1;
  const parsedLimit = Math.min(50, parseInt(limit) || 10);

  try {
    const { profiles, total } = await getProfiles({
      filters: { gender, age_group, country_id, min_age, max_age, min_gender_probability, min_country_probability },
      sort: { sort_by, order },
      pagination: { page: parsedPage, limit: parsedLimit },
    });

    return res.status(200).json({
      status: 'success',
      page: parsedPage,
      limit: parsedLimit,
      total,
      data: profiles.map(formatProfile),
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ status: 'error', message });
  }
}

export async function searchProfilesHandler(req, res) {
  const { q, page, limit } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ status: 'error', message: 'Query parameter q is required' });
  }

  const filters = parseQuery(q);

  if (!filters) {
    return res.status(400).json({ status: 'error', message: 'Unable to interpret query' });
  }

  const parsedPage = parseInt(page) || 1;
  const parsedLimit = Math.min(50, parseInt(limit) || 10);

  try {
    const { profiles, total } = await getProfiles({
      filters,
      sort: {},
      pagination: { page: parsedPage, limit: parsedLimit },
    });

    return res.status(200).json({
      status: 'success',
      page: parsedPage,
      limit: parsedLimit,
      total,
      data: profiles.map(formatProfile),
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ status: 'error', message });
  }
}

export async function deleteProfileHandler(req, res) {
  try {
    await deleteProfile(req.params.id);
    return res.status(204).send();
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ status: 'error', message });
  }
}
