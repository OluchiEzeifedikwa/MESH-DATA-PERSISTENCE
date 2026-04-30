import prisma from '../lib/prisma.js';

// Find a user by their GitHub ID (used during OAuth login to check if user already exists)
export async function findUserByGithubId(githubId) {
  return prisma.user.findUnique({ where: { github_id: githubId } });
}

// Find a user by their internal UUID (used by /api/users/me to load the authenticated user's profile)
export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

// Create a new user record in the database (called on first login)
export async function createUser(data) {
  return prisma.user.create({ data });
}

// Update an existing user's fields (called on every login to keep profile in sync with GitHub)
export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}
