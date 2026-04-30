import prisma from '../lib/prisma.js';

// Store a new refresh token in the DB tied to a user with an expiry time
export async function createRefreshToken(data) {
  return prisma.refreshToken.create({ data });
}

// Look up a refresh token and include the owner's user record (used during token refresh and validation)
export async function findRefreshToken(token) {
  return prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
}

// Delete a single refresh token (called on logout or after a token is rotated)
export async function deleteRefreshToken(token) {
  return prisma.refreshToken.delete({ where: { token } });
}

// Delete all refresh tokens for a user (used when deactivating an account)
export async function deleteUserRefreshTokens(userId) {
  return prisma.refreshToken.deleteMany({ where: { user_id: userId } });
}

// Store a new OAuth state entry in the DB with PKCE and redirect_uri details
export async function createOAuthState(data) {
  return prisma.oAuthState.create({ data });
}

// Look up an OAuth state by its value (used to check CLI vs web flow before processing callback)
export async function findOAuthState(state) {
  return prisma.oAuthState.findUnique({ where: { state } });
}

// Delete an OAuth state after it has been used (states are one-time use only)
export async function deleteOAuthState(state) {
  return prisma.oAuthState.delete({ where: { state } });
}
