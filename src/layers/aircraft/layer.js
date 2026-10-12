import { BillboardCollection, Cartesian3, Math as CesiumMath, NearFarScalar } from 'cesium';

// A small yellow plane drawn as SVG, pointing up (north).
const PLANE_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">' +
    '<path fill="#ffd400" stroke="#000" stroke-width="0.8" d="M12 2c.8 0 1.3.7 1.3 1.6V9l7.7 4.6v2l-7.7-2.4v4.9l2.2 1.7V21L12 20l-3.5 1v-1.2l2.2-1.7v-4.9L3 15.6v-2L10.7 9V3.6C10.7 2.7 11.2 2 12 2z"/>' +
    '</svg>',
);

// Full size up close, smaller when zoomed out. 
const SIZE_BY_DISTANCE = new NearFarScalar(5.0e4, 1.0, 3.0e6, 0.4);

const FEET_TO_METRES = 0.3048;

// Draw aircraft as plane icons and keep them in sync with the latest data.
export function addAircraftLayer(viewer) {
    const billboards = viewer.scene.primitives.add(new BillboardCollection());
    const planes = new Map(); // aircraft id -> its billboard

    return {
        // Replace what's shown with this list: move existing planes, add new ones, remove gone ones.
        setAircraft(list) {
            const seen = new Set();

            for (const plane of list) {
                seen.add(plane.id);
                const position = Cartesian3.fromDegrees(plane.lon, plane.lat, plane.altitudeFt * FEET_TO_METRES);
                const rotation = -CesiumMath.toRadians(plane.heading); // Cesium turns anticlockwise

                const existing = planes.get(plane.id);
                if (existing) {
                    existing.position = position;
                    existing.rotation = rotation;
                    existing.id = plane; // newest data, for clicks later
                } else {
                    planes.set(plane.id, billboards.add({
                        image: PLANE_ICON,
                        position,
                        rotation,
                        alignedAxis: Cartesian3.UNIT_Z, // rotate relative to north
                        scaleByDistance: SIZE_BY_DISTANCE,
                        id: plane,
                    }));
                }
            }

            for (const [id, billboard] of planes) {
                if (!seen.has(id)) {
                    billboards.remove(billboard);
                    planes.delete(id);
                }
            }
        },
        setVisible(visible) {
            billboards.show = visible;
        },
    };
}