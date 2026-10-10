import { json2satrec } from "satellite.js";

// load the saved orbit file and prepare each satellite for propagation
export const loadSatellites = async () => {
  const response = await fetch("/data/satellites.json");
  const isJson = response.headers.get("content-type")?.includes("application/json");

  if (!response.ok || !isJson) {
    throw new Error(`Failed to load satellites.json: ${response.status} ${response.statusText}. Did you run "npm run fetch:satellites"?`);
  }

  const data = await response.json();
  const records = data.satellites;
  const satellites = [];

  for (const record of records) {
    try {
      satellites.push({
        name: record.OBJECT_NAME,
        noradId: record.NORAD_CAT_ID,
        record: record,
        satrec: json2satrec(record),
      });
    } catch (error) {
      console.error(`Failed to process satellite ${record.OBJECT_NAME} (NORAD ID ${record.NORAD_CAT_ID}): ${error.message}`);
    }
  }

  return {satellites, source: data.source ?? 'CelesTrak' };
};
