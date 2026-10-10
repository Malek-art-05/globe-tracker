import {
  Ion, Viewer, Terrain, Cartesian3, Cartesian2, Color,
  HeightReference, LabelStyle, VerticalOrigin, DistanceDisplayCondition, Credit, Entity, ScreenSpaceEventType,
} from 'cesium';

import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { places, launchSites } from './places.js';

import { loadSatellites } from './layers/satellites/source.js';
import { addSatellites, typeOf } from './layers/satellites/layer.js';

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
controller.maximumZoomDistance = 100000000; // can't zoom out further than 40,000 km
controller.minimumZoomDistance = 1000;     // can't zoom in closer than 1 km above the ground

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

//add launch site markers
for (const site of launchSites) {
  viewer.entities.add({
    name: site.name,
    position: Cartesian3.fromDegrees(site.lon, site.lat, 0),
    point: {
      pixelSize: 10,
      color: Color.ORANGE,
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    },
    label:{
      text: site.name,
      font: '14pt sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 3,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: new Cartesian2(0, -12),
      heightReference: HeightReference.CLAMP_TO_GROUND,
      distanceDisplayCondition: new DistanceDisplayCondition(0, 5000000),
    },
    description: `<p>Launch site in ${site.country}.</p><p>Lat ${site.lat}, Lon ${site.lon}</p>`,
  });
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
  } catch (error) {
    console.error(error);
  }
}

startSatellites();
