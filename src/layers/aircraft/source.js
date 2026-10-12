// Load aircraft data for a given location and radius.
export async function loadAircraftNear(lat, lon, radiusNm = 250) {
    const url = `/api/aircraft/point/${lat.toFixed(2)}/${lon.toFixed(2)}/${radiusNm}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Aircraft request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    //keep only planes with a known position and only fiels we use.
    return (data.ac ?? [])
        .filter((a) => typeof a.lat === 'number' && typeof a.lon === 'number')
        .map((a) => ({
            id: a.hex,
            callsign: a.flight?.trim() || a.r || a.hex,
            registration: a.r ?? 'unknown',
            type: a.t ?? 'unknown',
            lat: a.lat,
            lon: a.lon,
            onGround: a.alt_baro === 'ground',
            altitudeFt: typeof a.alt_baro === 'number' ? a.alt_baro : 0,
            speedKt: a.gs ?? 0,
            heading: a.track ?? 0,
        }));
}