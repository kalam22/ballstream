const API_BASE = '/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const csrfToken = localStorage.getItem('csrf_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return headers;
}

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function get(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function put(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function del(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchCSRFToken() {
  const res = await fetch(`${API_BASE}/auth/csrf`, { method: 'GET' });
  const data = await handleResponse(res);
  if (data?.data?.csrf_token) {
    localStorage.setItem('csrf_token', data.data.csrf_token);
  }
  return data;
}
