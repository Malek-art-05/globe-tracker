// Convert a raw record from Space-Track or CelesTrak into a slimmed-down version with only the fields we need, and with numeric values instead of strings.
export function slimRecord(r) {
  return {
    OBJECT_NAME: r.OBJECT_NAME,
    OBJECT_ID: r.OBJECT_ID,
    NORAD_CAT_ID: Number(r.NORAD_CAT_ID),
    OBJECT_TYPE: r.OBJECT_TYPE ?? 'PAYLOAD', // CelesTrak's "active" list is all payloads
    COUNTRY_CODE: r.COUNTRY_CODE ?? null,
    LAUNCH_DATE: r.LAUNCH_DATE ?? null,
    EPOCH: r.EPOCH,
    MEAN_MOTION: Number(r.MEAN_MOTION),
    ECCENTRICITY: Number(r.ECCENTRICITY),
    INCLINATION: Number(r.INCLINATION),
    RA_OF_ASC_NODE: Number(r.RA_OF_ASC_NODE),
    ARG_OF_PERICENTER: Number(r.ARG_OF_PERICENTER),
    MEAN_ANOMALY: Number(r.MEAN_ANOMALY),
    BSTAR: Number(r.BSTAR),
    MEAN_MOTION_DOT: Number(r.MEAN_MOTION_DOT),
    MEAN_MOTION_DDOT: Number(r.MEAN_MOTION_DDOT),
  };
}