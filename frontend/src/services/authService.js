import { post, get, fetchCSRFToken } from './api';

export async function login(email, password) {
  return post('/auth/login', { email, password });
}

export async function logout(token) {
  return post('/auth/logout', {}, token);
}

export async function verifySession() {
  return get('/auth/verify');
}

export async function getCSRF() {
  return fetchCSRFToken();
}
