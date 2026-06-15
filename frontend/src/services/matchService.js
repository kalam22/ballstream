import { get } from './api';

export async function getMatches() {
  return get('/matches');
}

export async function getMatchDetail(id) {
  return get(`/match/${id}`);
}

export async function getBootstrap() {
  return get('/bootstrap');
}

export async function getUpstreams() {
  return get('/upstreams');
}
