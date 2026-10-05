import { Ion, Viewer, Terrain } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

const viewer = new Viewer('cesiumContainer', {
  terrain: Terrain.fromWorldTerrain(),
});
viewer.scene.globe.enableLighting = true; // day/night shading