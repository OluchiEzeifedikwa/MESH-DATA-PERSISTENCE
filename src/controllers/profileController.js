import { createProfile, getProfileById, getProfiles, deleteProfile } from '../services/profileService.js';

export async function createProfileHandler(req, res) {
  const { name } = req.body;

  // Validate: missing or empty name → 400
  if (name === undefined || name === null || name === '') {
    return res.status(400).json({ status: 'error', message: 'Name is required' });
  }

  // Validate: non-string name → 422
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
        data: profile,
      });
    }

    return res.status(201).json({
      status: 'success',
      data: profile,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    const responseStatus = status === 502 ? '502' : 'error';
    return res.status(status).json({ status: responseStatus, message });
  }
}

export async function getProfileByIdHandler(req, res) {
  try {
    const profile = await getProfileById(req.params.id);
    return res.status(200).json({ status: 'success', data: profile });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ status: 'error', message });
  }
}

export async function getProfilesHandler(req, res) {
  try {
    const { gender, country_id, age_group } = req.query;
    const profiles = await getProfiles({ gender, country_id, age_group });
    return res.status(200).json({ status: 'success', count: profiles.length, data: profiles });
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
