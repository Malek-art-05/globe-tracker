// Run with: npm run fetch:launches

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fetchLaunches, slimLaunch } from './lib/launchlibrary.js';

const OUT_DIR = 'public/data';
const OUT_FILE = `${OUT_DIR}/launches.json`;
const ONE_HOUR = 60 * 60 * 1000; // milliseconds

// Fetch upcoming and past launches from LaunchLibrary 2, slim them down, and save them to public/data/launches.json

try {
    const agesMS = Date.now() - (await stat(OUT_FILE)).mtimeMs;
    if (agesMS < ONE_HOUR) {
        console.log(`launches.json is only ${Math.round(agesMS / 60000)} minutes old. Skipping download.`);
        process.exit(0);
    }
} catch {
    // No file yet, so download it.
}   

try {
    const upcoming = await fetchLaunches('upcoming', 100);
    const previous = await fetchLaunches('previous', 100);

    const data = {
        generatedAt: new Date().toISOString(),
        source: 'LaunchLibrary 2',
        launches: [...upcoming, ...previous].map(slimLaunch),
        upcoming: upcoming.map(slimLaunch),
        previous: previous.map(slimLaunch),
    };

    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(OUT_FILE, JSON.stringify(data));
    const sizeMb = (JSON.stringify(data).length / 1e6).toFixed(1);
    console.log(`Saved ${data.launches.length} launches from LaunchLibrary 2 to ${OUT_FILE} (${sizeMb} MB)`);
}   catch (error) {
    console.error('Error fetching launches:', error);
    process.exit(1);
}