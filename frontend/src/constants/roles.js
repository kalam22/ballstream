export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  USER: 'user',
};

export function isAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}

export function roleLabel(role) {
  return role === ROLES.SUPER_ADMIN ? 'Super Admin' : 'User';
}
