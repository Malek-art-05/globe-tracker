import {
  Cartesian2, Cartesian3, CallbackPositionProperty, Color, JulianDate,
  LabelStyle, VerticalOrigin, PointPrimitiveCollection, NearFarScalar,
} from 'cesium';
import { propagate, gstime, eciToGeodetic } from 'satellite.js';

// Colour per kind of object. Debris and unknown are faint so they don't hide Earth.
const COLORS = {
  PAYLOAD: Color.CYAN.withAlpha(0.85),
  'ROCKET BODY': Color.ORANGE.withAlpha(0.85),
  DEBRIS: Color.LIGHTGRAY.withAlpha(0.4),
  UNKNOWN: Color.WHITE.withAlpha(0.4),
};

// Dots shrink as you zoom out: 2x size at 1,000 km away, 0.7x at 20,000 km.
const SIZE_BY_DISTANCE = new NearFarScalar(1.0e6, 2.0, 2.0e7, 0.7);

// Update the whole set over this many frames (60 frames is about 1 second).
const FRAMES_PER_SWEEP = 60;

// Space-Track uses a few other type names; treat anything unknown as UNKNOWN.
export function typeOf(sat) {
  const type = sat.record.OBJECT_TYPE;
  return COLORS[type] ? type : 'UNKNOWN';
}

// Where is this satellite at this moment? Returns a Cesium position, or undefined.
export function positionAt(satrec, date, gmst = gstime(date)) {
  const result = propagate(satrec, date);
  if (!result || !result.position) return undefined; // orbit maths failed (e.g. decayed)

  const geo = eciToGeodetic(result.position, gmst);
  return Cartesian3.fromRadians(geo.longitude, geo.latitude, geo.height * 1000); // km -> m
}

// HTML shown in the info box when you click a satellite.
function describe(sat) {
  const r = sat.record;
  const periodMinutes = 1440 / r.MEAN_MOTION; // MEAN_MOTION = orbits per day
  return `
    <table>
      <tr><td>Type</td><td>${r.OBJECT_TYPE}</td></tr>
      <tr><td>NORAD ID</td><td>${r.NORAD_CAT_ID}</td></tr>
      <tr><td>International ID</td><td>${r.OBJECT_ID}</td></tr>
      <tr><td>Country</td><td>${r.COUNTRY_CODE ?? 'unknown'}</td></tr>
      <tr><td>Launch date</td><td>${r.LAUNCH_DATE ?? 'unknown'}</td></tr>
      <tr><td>Inclination</td><td>${r.INCLINATION.toFixed(1)}°</td></tr>
      <tr><td>Orbit period</td><td>${periodMinutes.toFixed(1)} min</td></tr>
      <tr><td>Data epoch</td><td>${r.EPOCH} UTC</td></tr>
    </table>`;
}

// Draw every satellite as a fast point, and keep the visible ones moving.
export function addSatellites(viewer, satellites) {
  const points = viewer.scene.primitives.add(new PointPrimitiveCollection());
  const hiddenTypes = new Set();

  // Recalculate one satellite and move (or hide) its dot.
  function update(sat, date, gmst) {
    const position = positionAt(sat.satrec, date, gmst);
    if (position) {
      sat.point.position = position;
      sat.point.show = true;
    } else {
      sat.point.show = false;
    }
  }

  // 1. One point per satellite. `id` lets a click find the satellite again.
  const now = new Date();
  const gmst = gstime(now);
  for (const sat of satellites) {
    sat.point = points.add({
      position: Cartesian3.ZERO,
      show: false,
      pixelSize: 2,
      scaleByDistance: SIZE_BY_DISTANCE,
      color: COLORS[typeOf(sat)],
      id: sat,
    });
    update(sat, now, gmst);
  }

  // 2. Every frame, recalculate one slice of the satellites (skipping hidden types).
  //    The whole set is refreshed about once per second.
  const perFrame = Math.ceil(satellites.length / FRAMES_PER_SWEEP);
  let next = 0;

  viewer.scene.preUpdate.addEventListener((scene, time) => {
    const date = JulianDate.toDate(time);
    const frameGmst = gstime(date);

    for (let i = 0; i < perFrame; i++) {
      const sat = satellites[next];
      next = (next + 1) % satellites.length;
      if (!hiddenTypes.has(typeOf(sat))) update(sat, date, frameGmst);
    }
  });

  // 3. One reusable "selected" entity: label + info box for the clicked satellite only.
  const selected = viewer.entities.add({
    show: false,
    point: { pixelSize: 9, color: Color.YELLOW, outlineColor: Color.BLACK, outlineWidth: 2 },
    label: {
      font: '13px sans-serif',
      fillColor: Color.YELLOW,
      outlineColor: Color.BLACK,
      outlineWidth: 3,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: new Cartesian2(0, -10),
    },
  });

  // The two things main.js can do with this layer:
  return {
    // Show the yellow marker + info box on one satellite. Returns the entity to select.
    select(sat) {
      selected.name = sat.name;
      selected.label.text = sat.name;
      selected.description = describe(sat);
      selected.position = new CallbackPositionProperty(
        (time) => positionAt(sat.satrec, JulianDate.toDate(time)),
        false,
      );
      selected.show = true;
      return selected;
    },

    // Show or hide every object of one type (PAYLOAD, ROCKET BODY, DEBRIS, UNKNOWN).
    setTypeVisible(type, visible) {
      if (visible) hiddenTypes.delete(type);
      else hiddenTypes.add(type);

      const date = JulianDate.toDate(viewer.clock.currentTime);
      const typeGmst = gstime(date);
      for (const sat of satellites) {
        if (typeOf(sat) !== type) continue;
        if (visible) update(sat, date, typeGmst);
        else sat.point.show = false;
      }
    },
  };
}
