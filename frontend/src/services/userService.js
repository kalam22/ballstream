import { get, post, put, del } from './api';

export async function getUsers() {
  return get('/users');
}

export async function getUser(id) {
  return get(`/users/${id}`);
}

export async function createUser(data) {
  return post('/users', data);
}

export async function updateUser(id, data) {
  return put(`/users/${id}`, data);
}

export async function deleteUser(id) {
  return del(`/users/${id}`);
}

export async function resetPassword(id) {
  return post(`/users/${id}/reset-password`);
}

export async function resetSession(id) {
  return post(`/users/${id}/reset-session`);
}
