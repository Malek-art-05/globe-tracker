import {
  Ion, Viewer, Terrain, Math as CesiumMath, Cartesian3, Cartesian2, Cartographic, Color, JulianDate,
  HeightReference, LabelStyle, VerticalOrigin, DistanceDisplayCondition, Credit, Entity, ScreenSpaceEventType,
} from 'cesium';

import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';

import { loadSatellites } from './layers/satellites/source.js';
import { addSatellites, typeOf, positionAt } from './layers/satellites/layer.js';
import { addSatelliteSearch } from './layers/satellites/search.js';

import { loadLaunches } from './layers/launches/source.js';
import { addLaunchPads } from './layers/launches/layer.js';
import { showLaunchList } from './layers/launches/list.js';

import { loadAircraftNear } from './layers/aircraft/source.js';
import { addAircraftLayer } from './layers/aircraft/layer.js';

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

const viewer = new Viewer('cesiumContainer', {
  terrain: Terrain.fromWorldTerrain(),
  shouldAnimate: true,
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  fullscreenButton: false,
});

// Lock the camera: always look straight at the centre of the Earth
const controller = viewer.scene.screenSpaceCameraController;
controller.enableTilt = false;
controller.enableLook = false;
controller.maximumZoomDistance = 150000000; // can't zoom out further than 40,000 km
controller.minimumZoomDistance = 1;     // can't zoom in closer than 1 km above the ground

// day/night shading
viewer.scene.globe.enableLighting = true;

/*
// Move camera to place
function flyToPlace(place) {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(place.lon, place.lat, place.height),
    duration: 2,
  });
}
*/

// Start looking at the first place in the list 
viewer.camera.setView({
  destination: Cartesian3.fromDegrees(-40, 25, 20000000), // Whole Earth
});

// Makeone button for each place
const panel = document.getElementById('panel');

/*
for (const place of places) {
  const button = document.createElement('button');
  button.textContent = place.name;
  button.addEventListener('click', () => flyToPlace(place));
  panel.appendChild(button);
}
*/

// Which kinds of object to show at start. Debris is off so Earth stays visible.
const OBJECT_TYPES = [
  { type: 'PAYLOAD', label: 'Satellites', on: true },
  { type: 'ROCKET BODY', label: 'Rocket bodies', on: true },
  { type: 'DEBRIS', label: 'Debris', on: false },
  { type: 'UNKNOWN', label: 'Unknown', on: false },
];

// Load and show satellites
async function startSatellites() {
  try {
    const { satellites, source } = await loadSatellites();
    const satelliteLayer = addSatellites(viewer, satellites);
    viewer.creditDisplay.addStaticCredit(new Credit(`Satellite data: ${source}`));
    console.log(`Showing ${satellites.length} objects from ${source}`);

    // One checkbox per kind of object, with how many there are.
    for (const { type, label, on } of OBJECT_TYPES) {
      const count = satellites.filter((sat) => typeOf(sat) === type).length;

      const row = document.createElement('label');
      row.className = 'filter';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = on;
      box.addEventListener('change', () => satelliteLayer.setTypeVisible(type, box.checked));
      row.append(box, ` ${label} (${count.toLocaleString()})`);
      panel.appendChild(row);

      satelliteLayer.setTypeVisible(type, on);
    }

    const ORBITS = [
      { value: 'ALL', label: 'All orbits' },
      { value: 'LEO', label: 'Low Earth orbit (LEO)' },
      { value: 'MEO', label: 'Medium Earth orbit (MEO)' },
      { value: 'GEO', label: 'Geostationary orbit (GEO)' },
      { value: 'HEO', label: 'High Earth orbit (HEO)' },
    ];
    const orbitSelect = document.createElement('select');
    orbitSelect.className = 'orbit-select';
    for (const { value, label } of ORBITS) {
      const count = value === 'ALL'
        ? satellites.length
        : satellites.filter((sat) => sat.orbit === value).length;
      orbitSelect.add(new Option(`${label} (${count.toLocaleString()})`, value));
    }

    orbitSelect.addEventListener('change', () => satelliteLayer.setOrbitFilter(orbitSelect.value));
    panel.appendChild(orbitSelect);

    // Search: pick a result to select that satellite and fly to it.
    addSatelliteSearch(document.getElementById('search'), satellites, (sat) => {
      viewer.selectedEntity = satelliteLayer.select(sat);

      const position = positionAt(sat.satrec, JulianDate.toDate(viewer.clock.currentTime));
      if (!position) return; // orbit maths failed, nothing to fly to
      const spot = Cartographic.fromCartesian(position);
      viewer.camera.flyTo({
        destination: Cartesian3.fromRadians(spot.longitude, spot.latitude, spot.height + 3000000),
        duration: 2,
      });
    });

    // Clicks: launch markers are entities, satellites are fast points.
    viewer.screenSpaceEventHandler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      const target = picked?.id;

      if (target instanceof Entity) {
        viewer.selectedEntity = target;
      } else if (target?.satrec) {
        viewer.selectedEntity = satelliteLayer.select(target);
      } else {
        viewer.selectedEntity = undefined;
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Show a tooltip when the mouse is over a satellite. Hide it when the mouse leaves the globe area.
    const tooltip = document.getElementById('tooltip');
    const HOVER_MAX_DISTANCE = 5000000; // 5,000 km
    let lastPickTime = 0;

    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      const now = performance.now();
      if (now - lastPickTime < 100) return; // throttle to 10 fps
      lastPickTime = now;

      const picked = viewer.scene.pick(movement.endPosition, 15, 15);// 15 pixel tolerance
      const sat = picked?.id;
      const closeEnough = sat?.satrec &&
        Cartesian3.distance(viewer.camera.positionWC, sat.point.position) < HOVER_MAX_DISTANCE;

      if (closeEnough) {
        tooltip.textContent = sat.name;
        tooltip.style.display = 'block';
        tooltip.style.left = `${movement.endPosition.x + 10}px`;
        tooltip.style.top = `${movement.endPosition.y + 10}px`;
      } else {
        tooltip.style.display = 'none';
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    //Cesium only reports movement over the globe so hide the tooltip if the mouse leaves the globe area.
    viewer.canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

  } catch (error) {
    console.error(error);
  }
}


startSatellites();

// Load and show launches
async function startLaunches() {
  try {
    const { upcoming, previous, source } = await loadLaunches();
    const pads = addLaunchPads(viewer, upcoming, previous);
    viewer.creditDisplay.addStaticCredit(new Credit(`Launch data: ${source}`));

    // launch list: clicking a launch in the list flies to its pad and shows the info box.
    const padByKey = new Map(pads.map((pad) => [`${pad.lat},${pad.lon}`, pad]));
    showLaunchList(document.getElementById('launchList'), upcoming, (launch) => {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(launch.lon, launch.lat, 2000000),
        duration: 2,
      });
      const pad = padByKey.get(`${launch.lat},${launch.lon}`);
      if (pad) viewer.selectedEntity = pad.entity;
    });
    console.log(`Showing ${pads.length} launch pads (${upcoming.length} upcoming, ${previous.length} recent launches)`);
  } catch (error) {
    console.error(error);
  }
}

startLaunches();

// Aircraft: fetch planes around the point the camera looks at, every 10 seconds.
const AIRCRAFT_REFRESH_MS = 10000;
const AIRCRAFT_MAX_HEIGHT = 3000000; // only load when the camera is below 3,000 km

function startAircraft() {
  const aircraftLayer = addAircraftLayer(viewer);
  viewer.creditDisplay.addStaticCredit(
    new Credit('<a href="https://adsb.fi" target="_blank">Aircraft data: adsb.fi</a>'),
  );

  // Checkbox to show/hide aircraft, with a status text next to it.
  const row = document.createElement('label');
  row.className = 'filter';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = true;
  const status = document.createElement('span');
  status.textContent = 'Aircraft';
  row.append(box, status);
  panel.appendChild(row);

  let loading = false;    // true while a request is on its way
  let lastFetchTime = 0;  // when the last request started

  async function refresh() {
    if (!box.checked || loading) return;
    if (performance.now() - lastFetchTime < 2000) return; // API allows 1 request per second

    const camera = viewer.camera.positionCartographic;
    if (camera.height > AIRCRAFT_MAX_HEIGHT) {
      aircraftLayer.setAircraft([]);
      status.textContent = 'Aircraft (zoom in to load)';
      return;
    }

    loading = true;
    lastFetchTime = performance.now();
    try {
      const lat = CesiumMath.toDegrees(camera.latitude);
      const lon = CesiumMath.toDegrees(camera.longitude);
      const list = await loadAircraftNear(lat, lon);
      aircraftLayer.setAircraft(list);
      status.textContent = `Aircraft (${list.length})`;
    } catch (error) {
      console.error(error);
      status.textContent = 'Aircraft (unavailable)';
    } finally {
      loading = false;
    }
  }

  box.addEventListener('change', () => {
    aircraftLayer.setVisible(box.checked);
    refresh();
  });
  viewer.camera.moveEnd.addEventListener(refresh); // load new area after you move
  setInterval(refresh, AIRCRAFT_REFRESH_MS);      // keep positions fresh
  refresh();
}

startAircraft();