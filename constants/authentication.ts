export const AUTH_API_PATHS = Object.freeze({
  registration: '/api/v1/auth/register',
  login: '/api/v1/auth/login',
  forgotPassword: '/api/v1/auth/forgot-password',
});

export const AUTH_COOKIE_NAMES = Object.freeze([
  'propify_user_access_token',
  'propify_user_refresh_token',
] as const);
