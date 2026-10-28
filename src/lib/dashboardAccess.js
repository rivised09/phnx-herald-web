import { cookies } from 'next/headers';

/**
 * Mirrors the middleware's access check.
 *
 * When auth is off (or no access code is configured) the middleware never
 * issues `phnx_access`, so demanding the cookie here would lock the dashboard
 * out of its own routes.
 */
const AUTH_DISABLED = process.env.AUTH_ENABLED === 'false';

export async function hasDashboardAccess() {
  if (AUTH_DISABLED || !process.env.DASHBOARD_ACCESS_CODE) return true;
  const store = await cookies();
  return Boolean(store.get('phnx_access')?.value);
}
