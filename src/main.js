import {
  Ion, Viewer, Terrain, Cartesian3, Cartesian2, Color,
  HeightReference, LabelStyle, VerticalOrigin, DistanceDisplayCondition, Credit, Entity, ScreenSpaceEventType,
} from 'cesium';

import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { places} from './places.js';

import { loadSatellites } from './layers/satellites/source.js';
import { addSatellites, typeOf } from './layers/satellites/layer.js';

import { loadLaunches } from './layers/launches/source.js';
import { addLaunchPads } from './layers/launches/layer.js';

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

// Move camera to place
function flyToPlace(place) {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(place.lon, place.lat, place.height),
    duration: 2,
  });
}

// Start looking at the first place in the list 
viewer.camera.setView({
  destination: Cartesian3.fromDegrees(places[0].lon, places[0].lat, places[0].height),
});

// Makeone button for each place
const panel = document.getElementById('panel');

for (const place of places) {
  const button = document.createElement('button');
  button.textContent = place.name;
  button.addEventListener('click', () => flyToPlace(place));
  panel.appendChild(button);
}

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
    const {upcoming, previous, source} = await loadLaunches();
    const pads = addLaunchPads(viewer, upcoming, previous);
    viewer.creditDisplay.addStaticCredit(new Credit(`Launch data: ${source}`));
    console.log(`Showing ${pads.length} launch pads (${upcoming.length} upcoming, ${previous.length} recent launches)`);
  } catch (error) {
    console.error(error);
  }
}

startLaunches();