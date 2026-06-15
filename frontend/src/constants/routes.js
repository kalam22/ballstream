export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  MATCH: '/match/:id',
  STATUS: '/status',
  USERS: '/users',
  PROFILE: '/profile',
};

export function matchRoute(id) {
  return `/match/${id}`;
}
