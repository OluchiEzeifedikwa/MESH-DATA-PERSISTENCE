import prisma from '../lib/prisma.js';

export async function findUserByGithubId(githubId) {
  return prisma.user.findUnique({ where: { github_id: githubId } });
}

export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data) {
  return prisma.user.create({ data });
}

export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data });
}
