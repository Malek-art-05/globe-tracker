// Run with: npm run fetch:satellites
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fetchSpaceTrackCatalog } from './lib/spacetrack.js';
import { fetchSatelliteGroup } from './lib/celestrak.js';
import { slimRecord } from './lib/orbits.js';

const OUT_DIR = 'public/data';
const OUT_FILE = `${OUT_DIR}/satellites.json`;
const TWO_HOURS = 2 * 60 * 60 * 1000; // milliseconds

// Check if the existing satellites.json is less than 2 hours old. If so, skip the download.
try {
  const ageMs = Date.now() - (await stat(OUT_FILE)).mtimeMs;
  if (ageMs < TWO_HOURS) {
    console.log(`satellites.json is only ${Math.round(ageMs / 60000)} minutes old. Skipping download.`);
    process.exit(0);
  }
} catch {
  // No file yet, so download it.
}

// Fetch the latest on-orbit catalog from Space-Track or CelesTrak, slim it down, and save it to public/data/satellites.json
let source;
let records;
try {
  records = await fetchSpaceTrackCatalog(process.env.SPACETRACK_USER, process.env.SPACETRACK_PASS);
  source = 'Space-Track.org';
} catch (error) {
  console.warn(`Space-Track failed: ${error.message}`);
  console.warn('Falling back to CelesTrak "active" (working satellites only).');
  try {
    const result = await fetchSatelliteGroup('active');
    records = result.satellites;
    source = 'CelesTrak';
  } catch (fallbackError) {
    console.error(`CelesTrak failed too: ${fallbackError.message}. Keeping the old file (if any).`);
    process.exit(1);
  }
}

const data = {
  generatedAt: new Date().toISOString(),
  source: source,
  satellites: records.map(slimRecord),
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(data));
const sizeMb = (JSON.stringify(data).length / 1e6).toFixed(1);
console.log(`Saved ${data.satellites.length} objects from ${source} to ${OUT_FILE} (${sizeMb} MB)`);
