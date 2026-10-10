import {
    Cartesian2, Cartesian3, Color, DistanceDisplayCondition, HeightReference, LabelStyle, VerticalOrigin
} from 'cesium';

// Add + label per launch site. Positions are static, so we don't need to recalculate every frame.
function formatTime(isoTime) {
    return new Date(isoTime).toLocaleString(undefined, { 
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    });
}

// Add + label per launch site. Positions are static, so we don't need to recalculate every frame.
function launchRow(launch) {
   return `<tr><td>${formatTime(launch.net)}</td><td>${launch.name}</td><td>${launch.status}</td></tr>`;
}

// HTML shown in the info box when you click a launch site.
function describePad(pad) {
    const next = pad.upcoming[0];
    let html = `<p>${pad.location ?? ''}</p>`;

  if (next) {
    html += `
      <h3>Next launch</h3>
      <p><b>${next.name}</b><br>
      ${formatTime(next.net)} (${next.status})<br>
      ${next.rocket} · ${next.provider}<br>
      ${next.orbit ? `Orbit: ${next.orbit}` : ''}</p>`;
  }
  if (pad.upcoming.length > 1) {
    html += `<h3>Also upcoming</h3><table>${pad.upcoming.slice(1, 6).map(launchRow).join('')}</table>`;
  }
  if (pad.previous.length > 0) {
    html += `<h3>Recent</h3><table>${pad.previous.slice(0, 3).map(launchRow).join('')}</table>`;
  }
  return html;
}

// Group launches by pad: one marker per pad, not one per launch.
function groupByPad(upcoming, previous) {
  const pads = new Map(); // key "lat,lon" -> pad info

  function padFor(launch) {
    const key = `${launch.lat},${launch.lon}`;
    if (!pads.has(key)) {
      pads.set(key, {
        name: launch.padName,
        location: launch.location,
        lat: launch.lat,
        lon: launch.lon,
        upcoming: [],
        previous: [],
      });
    }
    return pads.get(key);
  }

  for (const launch of upcoming) padFor(launch).upcoming.push(launch);
  for (const launch of previous) padFor(launch).previous.push(launch);

  // Soonest first for upcoming, newest first for previous.
  for (const pad of pads.values()) {
    pad.upcoming.sort((a, b) => new Date(a.net) - new Date(b.net));
    pad.previous.sort((a, b) => new Date(b.net) - new Date(a.net));
  }
  return [...pads.values()];
}

// Add one marker per launch pad. Green = has an upcoming launch, grey = recent launches only.
export function addLaunchPads(viewer, upcoming, previous) {
  const pads = groupByPad(upcoming, previous);

  for (const pad of pads) {
    const active = pad.upcoming.length > 0;

    viewer.entities.add({
      name: pad.name,
      position: Cartesian3.fromDegrees(pad.lon, pad.lat),
      point: {
        pixelSize: active ? 10 : 7,
        color: active ? Color.GREEN : Color.GRAY,
        outlineColor: Color.BLACK,
        outlineWidth: 0.5,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: pad.name,
        font: '13px sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -12),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 3000000),
      },
      description: describePad(pad),
    });
  }

  return pads;
}