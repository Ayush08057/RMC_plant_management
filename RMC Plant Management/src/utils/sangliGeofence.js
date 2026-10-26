/**
 * Sangli Regional Geofencing & Landmark Directory
 * Provides high-precision landmark resolution for SM Concrete Tech RMC operations
 */

export const SANGLI_LANDMARKS = [
  {
    id: 'SANGLI_MARKET_YARD',
    name: 'Sangli Market Yard',
    shortName: 'Market Yard',
    lat: 16.8584,
    lng: 74.5824,
    radiusMeters: 1800,
    address: 'APMC Market Yard, Sangli, Maharashtra 416416',
    type: 'COMMERCIAL_HUB',
  },
  {
    id: 'SANGLI_PLANT_HQ',
    name: 'SM Concrete Plant HQ',
    shortName: 'Plant HQ',
    lat: 16.8450,
    lng: 74.6200,
    radiusMeters: 1200,
    address: 'Tanang, Sangli-Miraj Road, Sangli, Maharashtra 416410',
    type: 'MAIN_PLANT',
  },
  {
    id: 'KUPWAD_MIDC',
    name: 'Kupwad MIDC Industrial Zone',
    shortName: 'Kupwad MIDC',
    lat: 16.8700,
    lng: 74.6100,
    radiusMeters: 1600,
    address: 'MIDC Kupwad, Sangli, Maharashtra 416436',
    type: 'INDUSTRIAL_ZONE',
  },
  {
    id: 'VISHRAMBAG_HUB',
    name: 'Vishrambag Commercial Hub',
    shortName: 'Vishrambag',
    lat: 16.8480,
    lng: 74.6020,
    radiusMeters: 1400,
    address: 'Vishrambag, Sangli, Maharashtra 416415',
    type: 'FINANCE_COMMERCIAL',
  },
  {
    id: 'SANGLI_CITY_CENTER',
    name: 'Sangli City Center',
    shortName: 'Sangli City',
    lat: 16.8550,
    lng: 74.5700,
    radiusMeters: 2000,
    address: 'Sangli City, Maharashtra 416416',
    type: 'MUNICIPAL_CENTER',
  },
  {
    id: 'MIRAJ_CORRIDOR',
    name: 'Miraj Industrial Corridor',
    shortName: 'Miraj Hub',
    lat: 16.8300,
    lng: 74.6400,
    radiusMeters: 2200,
    address: 'Miraj MIDC, Sangli District, Maharashtra',
    type: 'CORRIDOR',
  },
];

/**
 * Calculates straight-line distance in meters between two coordinates via Haversine formula
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return Infinity;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return Infinity;

  const R = 6371000;
  const dLat = (numLat2 - numLat1) * (Math.PI / 180);
  const dLon = (numLon2 - numLon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(numLat1 * Math.PI / 180) * Math.cos(numLat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Resolves coordinates into an operational Sangli landmark name and formatted location string
 */
export function resolveSangliLandmark(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return {
      landmarkName: 'Location Pending',
      address: 'GPS Telemetry Pending',
      distanceMeters: null,
      isKnownLandmark: false,
    };
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  // Check known Sangli landmarks
  for (const lm of SANGLI_LANDMARKS) {
    const dist = calculateDistanceMeters(numLat, numLng, lm.lat, lm.lng);
    if (dist <= lm.radiusMeters) {
      return {
        landmarkName: lm.name,
        shortName: lm.shortName,
        address: lm.address,
        distanceMeters: dist,
        isKnownLandmark: true,
        type: lm.type,
      };
    }
  }

  // Check Sangli District bounding box (lat: 16.70 to 16.98, lng: 74.40 to 74.80)
  if (numLat >= 16.70 && numLat <= 16.98 && numLng >= 74.40 && numLng <= 74.80) {
    return {
      landmarkName: 'Sangli Regional Zone',
      shortName: 'Sangli District',
      address: `Sangli District (${numLat.toFixed(4)}°N, ${numLng.toFixed(4)}°E)`,
      distanceMeters: null,
      isKnownLandmark: true,
      type: 'REGIONAL',
    };
  }

  return {
    landmarkName: `${numLat.toFixed(4)}°N, ${numLng.toFixed(4)}°E`,
    shortName: `${numLat.toFixed(3)}°, ${numLng.toFixed(3)}°`,
    address: `Coordinates: ${numLat.toFixed(5)}° N, ${numLng.toFixed(5)}° E`,
    distanceMeters: null,
    isKnownLandmark: false,
    type: 'COORDINATES',
  };
}
