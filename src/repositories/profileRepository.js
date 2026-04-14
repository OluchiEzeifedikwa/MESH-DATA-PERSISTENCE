import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function findByName(name) {
  return prisma.profile.findUnique({ where: { name } });
}

export async function findById(id) {
  return prisma.profile.findUnique({ where: { id } });
}

export async function findAll(filters = {}) {
  const where = {};
  if (filters.gender) where.gender = { equals: filters.gender, mode: 'insensitive' };
  if (filters.country_id) where.country_id = { equals: filters.country_id, mode: 'insensitive' };
  if (filters.age_group) where.age_group = { equals: filters.age_group, mode: 'insensitive' };
  return prisma.profile.findMany({ where });
}

export async function create(profileData) {
  return prisma.profile.create({ data: profileData });
}

export async function deleteById(id) {
  return prisma.profile.delete({ where: { id } });
}
