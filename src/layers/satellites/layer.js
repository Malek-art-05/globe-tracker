import{
    Cartesian2, Cartesian3, CallbackPositionProperty, Color, JulianDate, LabelStyle, VerticalOrigin, DistanceDisplayCondition, HeightReference, Viewer
} from 'cesium';
import {propagate, gstime, eciToGeodetic} from 'satellite.js';

// Where is this satellite now? Return a position in lat/lon/alt (cesium position_)
export function positionAt(satrec, date) {
    const result = propagate(satrec, date);
    if (!result || !result.position) return undefined;// orbit maths failed (e.g. satellite decayed)
    
    const geo = eciToGeodetic(result.position, gstime(date));
    return Cartesian3.fromRadians(geo.longitude, geo.latitude, geo.height * 1000); //km to m
}

// HTML shown in the info box when you click a satellite.
function describe(sat) {
  const r = sat.record;
  const periodMinutes = 1440 / r.MEAN_MOTION; // MEAN_MOTION = orbits per day
  return `
    <table>
      <tr><td>NORAD ID</td><td>${r.NORAD_CAT_ID}</td></tr>
      <tr><td>International ID</td><td>${r.OBJECT_ID}</td></tr>
      <tr><td>Inclination</td><td>${r.INCLINATION.toFixed(1)}°</td></tr>
      <tr><td>Orbit period</td><td>${periodMinutes.toFixed(1)} min</td></tr>
      <tr><td>Eccentricity</td><td>${r.ECCENTRICITY}</td></tr>
      <tr><td>Data epoch</td><td>${r.EPOCH} UTC</td></tr>
    </table>`;
}

// Add + label per sattelite. Positions are recalculated every frame, so the satellites move in real time.
export function addSatellites(viewer, satellites) {
  for (const sat of satellites) {
    viewer.entities.add({
      id: `sat-${sat.noradId}`,
      name: sat.name,
      position: new CallbackPositionProperty(
        (time) => positionAt(sat.satrec, JulianDate.toDate(time)),
        false,
      ),
      point: {
        pixelSize: 6,
        color: Color.CYAN,
        outlineColor: Color.BLACK,
        outlineWidth: 1,
      },
      label: {
        text: sat.name,
        font: '12px sans-serif',
        fillColor: Color.CYAN,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -8),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 4000000),
      },
      description: describe(sat),
    });
  }
}