import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { v7 as uuidv7 } from 'uuid';
import { findUserByGithubId, createUser, updateUser } from '../repositories/userRepository.js';
import {
  createRefreshToken, findRefreshToken, deleteRefreshToken,
  createOAuthState, findOAuthState, deleteOAuthState,
} from '../repositories/tokenRepository.js';

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username, is_active: user.is_active },
    process.env.JWT_SECRET,
    { expiresIn: '3m' }
  );
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await createRefreshToken({ id: uuidv7(), user_id: userId, token, expires_at: expiresAt });
  return token;
}

function buildGithubUrl(state, redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function initiateOAuth(codeChallenge, redirectUri) {
  const state = crypto.randomBytes(16).toString('hex');
  const callbackUrl = redirectUri || `${process.env.BACKEND_URL}/auth/github/callback`;
  await createOAuthState({
    state,
    code_challenge: codeChallenge || null,
    code_challenge_method: codeChallenge ? 'S256' : null,
    redirect_uri: redirectUri || null,
    expires_at: new Date(Date.now() + 10 * 60 * 1000),
  });
  return { state, url: buildGithubUrl(state, callbackUrl) };
}

async function exchangeCodeWithGithub(code, redirectUri) {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    { client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri },
    { headers: { Accept: 'application/json' } }
  );
  if (response.data.error) throw new Error(`GitHub OAuth error: ${response.data.error_description}`);
  return response.data.access_token;
}

async function fetchGithubUser(githubToken) {
  const [userRes, emailRes] = await Promise.all([
    axios.get('https://api.github.com/user', { headers: { Authorization: `Bearer ${githubToken}` } }),
    axios.get('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${githubToken}` } }),
  ]);
  const primaryEmail = emailRes.data.find(e => e.primary)?.email || null;
  return { ...userRes.data, email: primaryEmail };
}

async function upsertUser(githubUser) {
  const existing = await findUserByGithubId(String(githubUser.id));
  if (existing) {
    return updateUser(existing.id, {
      username: githubUser.login,
      email: githubUser.email,
      avatar_url: githubUser.avatar_url,
      last_login_at: new Date(),
    });
  }
  return createUser({
    id: uuidv7(),
    github_id: String(githubUser.id),
    username: githubUser.login,
    email: githubUser.email,
    avatar_url: githubUser.avatar_url,
    role: 'analyst',
    is_active: true,
    last_login_at: new Date(),
  });
}

async function resolveOAuthState(state) {
  const oauthState = await findOAuthState(state);
  if (!oauthState) { const e = new Error('Invalid or expired OAuth state'); e.status = 400; throw e; }
  if (new Date() > oauthState.expires_at) {
    await deleteOAuthState(state);
    const e = new Error('OAuth state expired'); e.status = 400; throw e;
  }
  await deleteOAuthState(state);
  return oauthState;
}

async function issueTokens(user) {
  if (!user.is_active) { const e = new Error('Account is inactive'); e.status = 403; throw e; }
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);
  return { user, accessToken, refreshToken };
}

export async function handleWebCallback(code, state) {
  const oauthState = await resolveOAuthState(state);
  const redirectUri = `${process.env.BACKEND_URL}/auth/github/callback`;
  const githubToken = await exchangeCodeWithGithub(code, redirectUri);
  const githubUser = await fetchGithubUser(githubToken);
  const user = await upsertUser(githubUser);
  return issueTokens(user);
}

export async function handleCliToken(code, state, codeVerifier) {
  const oauthState = await resolveOAuthState(state);
  if (oauthState.code_challenge) {
    const derived = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    if (derived !== oauthState.code_challenge) {
      const e = new Error('Invalid code verifier'); e.status = 400; throw e;
    }
  }
  const redirectUri = oauthState.redirect_uri || `${process.env.BACKEND_URL}/auth/github/callback`;
  const githubToken = await exchangeCodeWithGithub(code, redirectUri);
  const githubUser = await fetchGithubUser(githubToken);
  const user = await upsertUser(githubUser);
  return issueTokens(user);
}

export async function refreshTokens(token) {
  const record = await findRefreshToken(token);
  if (!record) { const e = new Error('Invalid refresh token'); e.status = 401; throw e; }
  if (new Date() > record.expires_at) {
    await deleteRefreshToken(token);
    const e = new Error('Refresh token expired'); e.status = 401; throw e;
  }
  if (!record.user.is_active) { const e = new Error('Account is inactive'); e.status = 403; throw e; }
  await deleteRefreshToken(token);
  const accessToken = generateAccessToken(record.user);
  const newRefreshToken = await generateRefreshToken(record.user.id);
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token) {
  try { await deleteRefreshToken(token); } catch { /* already gone */ }
}
