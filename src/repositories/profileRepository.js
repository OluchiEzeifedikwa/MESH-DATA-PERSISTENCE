import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function findByName(name) {
  return prisma.profile.findUnique({ where: { name } });
}

export async function create(profileData) {
  return prisma.profile.create({ data: profileData });
}
