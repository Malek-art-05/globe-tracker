
const BASE = 'https://www.space-track.org';
const QUERY = '/basicspacedata/query/class/gp/decay_date/null-val/epoch/%3Enow-10/orderby/norad_cat_id/format/json';

export async function fetchSpaceTrackCatalog(username, password) {
    if (!username || !password) {
        throw new Error('Space-Track username and password are required');
    }

    //login to Space-Track and get a cookie
    const login = await fetch(`${BASE}/ajaxauth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ identity: username, password: password }),
  });
  const loginText = await login.text();
  if (!login.ok || loginText.includes('"Login":"Failed"')) {
    throw new Error(`Space-Track login failed (${login.status}). Check your username and password.`);
  }
  const cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

  try {
    // One query for the whole on-orbit catalog.
    const response = await fetch(`${BASE}${QUERY}`, { headers: { Cookie: cookie } });
    if (!response.ok) {
      throw new Error(`Space-Track answered ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    await fetch(`${BASE}/ajaxauth/logout`, { headers: { Cookie: cookie } }).catch(() => {});
  }
}