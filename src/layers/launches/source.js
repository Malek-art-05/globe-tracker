//load the saved launches file
export async function loadLaunches() {
    const response = await fetch("/data/launches.json");
    const isJson = response.headers.get("content-type")?.includes("application/json");

    if (!response.ok || !isJson) {
        throw new Error(`Failed to load launches.json: ${response.status} ${response.statusText}. Did you run "npm run fetch:launches"?`);
    }

    const data = await response.json();

    // A launch that happened can be in both the past and upcoming lists, so we need to deduplicate them by ID.
    const previousIds = new Set(data.previous.map((launch) => launch.id));
    const upcoming = data.upcoming.filter((launch) => !previousIds.has(launch.id));

   return { upcoming, previous: data.previous, source: data.source };
}