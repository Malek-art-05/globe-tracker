import {
  Ion, Viewer, Terrain, Cartesian3, Cartesian2, Color,
  HeightReference, LabelStyle, VerticalOrigin, DistanceDisplayCondition,
} from 'cesium';

import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { places, launchSites } from './places.js';

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

const viewer = new Viewer('cesiumContainer', {
  terrain: Terrain.fromWorldTerrain(),
  animations: false,
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
    postion: Cartesian3.fromDegrees(site.lon, site.lat, 0),
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
      distanceDisplayCondition: new DistanceDisplayCondition(0, 5000000),
    },
    description: `<p>Launch site in ${site.country}.</p><p>Lat ${site.lat}, Lon ${site.lon}</p>`,
  });
}