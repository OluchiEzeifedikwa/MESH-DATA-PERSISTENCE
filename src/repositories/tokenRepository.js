import prisma from '../lib/prisma.js';

export async function createRefreshToken(data) {
  return prisma.refreshToken.create({ data });
}

export async function findRefreshToken(token) {
  return prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
}

export async function deleteRefreshToken(token) {
  return prisma.refreshToken.delete({ where: { token } });
}

export async function deleteUserRefreshTokens(userId) {
  return prisma.refreshToken.deleteMany({ where: { user_id: userId } });
}

export async function createOAuthState(data) {
  return prisma.oAuthState.create({ data });
}

export async function findOAuthState(state) {
  return prisma.oAuthState.findUnique({ where: { state } });
}

export async function deleteOAuthState(state) {
  return prisma.oAuthState.delete({ where: { state } });
}
