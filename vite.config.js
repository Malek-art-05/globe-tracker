import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const cesiumSource = 'node_modules/cesium/Build/Cesium';
const cesiumBaseUrl = 'cesiumStatic';

export default defineConfig({
  server: {
    proxy: {
      '/api/aircraft': {
        target: 'https://opendata.adsb.fi',
        changeOrigin: true,
        // /api/aircraft/point/LAT/LON/RADIUS  ->  /api/v3/lat/LAT/lon/LON/dist/RADIUS
        rewrite: (path) =>
          path.replace(/^\/api\/aircraft\/point\/([^/]+)\/([^/]+)\/([^/]+)/, '/api/v3/lat/$1/lon/$2/dist/$3'),
      },
    },
  },

    worker: {
        format: 'es',
      },
      define: { CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`) },
      plugins: [
        viteStaticCopy({
          targets: [
            { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
            { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
            { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
            { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl, rename: { stripBase: 4 } },
          ],
        }),
      ],
    });