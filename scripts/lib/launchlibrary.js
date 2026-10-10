//LAUCNHES FROM LAUNCHLIBRARY 2 the space devs
const Base = 'https://ll.thespacedevs.com/2.3.0';

// upcoming or past launches
export async function fetchLaunches(kind, limit){
    const url = `${Base}/launches/${kind}/?limit=${limit}&format=json`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'globe-tracker/0.1 (+https://github.com/Malek-art-05/globe-tracker)' },
    });

  if (!response.ok) {
    throw new Error(`LaunchLibrary 2 answered ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
}

//keep only what app shows
export function slimLaunch(launch) {
  return {
    id: launch.id,
    name: launch.name,
    net: launch.net, // launch time (UTC). "NET" = No Earlier Than
    status: launch.status?.abbrev ?? 'Unknown',
    provider: launch.launch_service_provider?.name ?? 'Unknown',
    rocket: launch.rocket?.configuration?.full_name ?? 'Unknown',
    mission: launch.mission?.name ?? null,
    missionDescription: launch.mission?.description ?? null,
    orbit: launch.mission?.orbit?.name ?? null,
    padName: launch.pad?.name ?? 'Unknown pad',
    location: launch.pad?.location?.name ?? null,
    country: launch.pad?.country?.name ?? null,
    lat: Number(launch.pad?.latitude),
    lon: Number(launch.pad?.longitude),
    image: launch.image?.thumbnail_url ?? null,
  };
}
