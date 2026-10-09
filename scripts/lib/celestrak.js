// download one celestrak group and returns it with a timestamp
export async function fetchSatelliteGroup(group) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'globe-tracker/0.1 (+https://github.com/Malek-art-05/globe-tracker)' },
  });

  if (!response.ok) {
    throw new Error(`CelesTrak answered ${response.status} ${response.statusText}`);
  }

  const satellites = await response.json();
  return {
    generatedAt: new Date().toISOString(),
    source: 'CelesTrak',
    group: group,
    satellites: satellites,
  };
}