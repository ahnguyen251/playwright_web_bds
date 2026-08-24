export const AUTH_API_PATHS = Object.freeze({
  registration: '/api/v1/auth/register',
  login: '/api/v1/auth/login',
  forgotPassword: '/api/v1/auth/forgot-password',
  profileView: '/api/v1/auth/me',
  profileUpdate: '/api/v1/user/profile',
  changePassword: '/api/v1/user/change-password',
});

export const AUTH_API_METHODS = Object.freeze({
  registration: 'POST',
  login: 'POST',
  forgotPassword: 'POST',
  profileView: 'GET',
  profileUpdate: 'PUT',
  changePassword: 'PUT',
} satisfies Record<keyof typeof AUTH_API_PATHS, string>);

export const AUTH_COOKIE_NAMES = Object.freeze([
  'propify_user_access_token',
  'propify_user_refresh_token',
] as const);
