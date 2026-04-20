import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALLOWED_SORT_FIELDS = ['age', 'created_at', 'gender_probability'];
const ALLOWED_ORDERS = ['asc', 'desc'];

function buildWhere(filters = {}) {
  const where = {};
  const { gender, age_group, country_id, min_age, max_age, min_gender_probability, min_country_probability } = filters;

  if (gender) where.gender = { equals: gender, mode: 'insensitive' };
  if (age_group) where.age_group = { equals: age_group, mode: 'insensitive' };
  if (country_id) where.country_id = { equals: country_id, mode: 'insensitive' };

  if (min_age !== undefined || max_age !== undefined) {
    where.age = {};
    if (min_age !== undefined) where.age.gte = Number(min_age);
    if (max_age !== undefined) where.age.lte = Number(max_age);
  }

  if (min_gender_probability !== undefined) {
    where.gender_probability = { gte: Number(min_gender_probability) };
  }

  if (min_country_probability !== undefined) {
    where.country_probability = { gte: Number(min_country_probability) };
  }

  return where;
}

export async function findByName(name) {
  return prisma.profile.findUnique({ where: { name } });
}

export async function findById(id) {
  return prisma.profile.findUnique({ where: { id } });
}

export async function findAll({ filters = {}, sort = {}, pagination = {} } = {}) {
  const where = buildWhere(filters);

  const sortField = ALLOWED_SORT_FIELDS.includes(sort.sort_by) ? sort.sort_by : 'created_at';
  const sortOrder = ALLOWED_ORDERS.includes(sort.order) ? sort.order : 'asc';

  const page = Math.max(1, parseInt(pagination.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit) || 10));
  const skip = (page - 1) * limit;

  return prisma.profile.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    skip,
    take: limit,
  });
}

export async function findCount(filters = {}) {
  return prisma.profile.count({ where: buildWhere(filters) });
}

export async function create(profileData) {
  return prisma.profile.create({ data: profileData });
}

export async function deleteById(id) {
  return prisma.profile.delete({ where: { id } });
}
