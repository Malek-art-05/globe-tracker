// Run with: npm run fetch:satellites
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fetchSatelliteGroup } from './lib/celestrak.js';

const GROUP = 'visual'; // ~150 satellites that can be seen with the naked eye
const OUT_DIR = 'public/data';
const OUT_FILE = `${OUT_DIR}/satellites.json`;
const TWO_HOURS = 2 * 60 * 60 * 1000; // milliseconds

// CelesTrak updates every 2 hours, so never download more often than that.
try {
  const ageMs = Date.now() - (await stat(OUT_FILE)).mtimeMs;
  if (ageMs < TWO_HOURS) {
    console.log(`satellites.json is only ${Math.round(ageMs / 60000)} minutes old. Skipping download.`);
    process.exit(0);
  }
} catch {
  // No file yet, so download it.
}

try {
  const data = await fetchSatelliteGroup(GROUP);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(data));
  console.log(`Saved ${data.satellites.length} satellites to ${OUT_FILE}`);
} catch (error) {
  console.error(`${error.message}. Stopping (no retries).`);
  process.exit(1);
}
