import * as THREE from 'three';

/**
 * Utility functions for Earth scene
 */
// Helper functions for lighting and coordinates
const EarthUtils = {
  /**
   * Calculates sun direction vector based on current UTC time
   * This simulates the sun's position for realistic day/night lighting
   * 
   * @param date - Current date/time
   * @returns THREE.Vector3 representing normalized sun direction
   */
  getSunDirection: (date: Date): THREE.Vector3 => {
    // Get current UTC time
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    
    // Calculate time as decimal hours (0-24)
    const timeInHours = hours + minutes / 60 + seconds / 3600;
    
    // Calculate sun's longitude based on UTC time
    // At UTC 12:00 (noon), sun is at longitude 0° (Greenwich)
    // Sun moves 15° per hour (360° / 24 hours)
    const sunLongitudeDegrees = (timeInHours - 12) * 15; // -180° to +180°
    const sunLongitudeRadians = THREE.MathUtils.degToRad(sunLongitudeDegrees);
    
    // Sun is always at latitude 0° (equator) for simplicity
    const sunLatitudeRadians = 0;
    
    // Convert spherical coordinates to Cartesian
    // This gives us the direction FROM Earth center TO the sun
    const x = Math.cos(sunLatitudeRadians) * Math.cos(sunLongitudeRadians);
    const y = Math.sin(sunLatitudeRadians);
    const z = Math.cos(sunLatitudeRadians) * Math.sin(sunLongitudeRadians);
    
    const sunDirection = new THREE.Vector3(x, y, z).normalize();
    
    // Debug logging to verify sun direction
    console.log(`UTC Time: ${timeInHours.toFixed(2)}h, Sun Longitude: ${sunLongitudeDegrees.toFixed(1)}°, Direction: [${sunDirection.x.toFixed(3)}, ${sunDirection.y.toFixed(3)}, ${sunDirection.z.toFixed(3)}]`);
    
    return sunDirection;
  },

  /**
   * Calculates appropriate lighting intensity based on sun position
   * 
   * @param sunDirection - The current sun direction vector
   * @returns number representing light intensity
   */
  getLightingIntensity: (sunDirection: THREE.Vector3): number => {
    // Use the sun's vertical component to shape intensity.
    // When the sun is above the horizon (y > 0) we scale intensity
    // modestly so daytime isn't overly bright. At night we keep a
    // reasonable minimum so features remain visible.
    const upFactor = sunDirection.y; // -1..1

    // Daytime: interpolate between 0.6 and 1.1 based on sun height
    if (upFactor > 0) {
      return Math.min(1.1, 0.6 + 0.5 * upFactor);
    }

    // Nighttime: keep a small but non-zero intensity for subtle illumination
    return 0.35;
  },

  /**
   * Converts lat/lng coordinates to 3D position on a sphere
   * 
   * @param lat - Latitude in degrees
   * @param lng - Longitude in degrees
   * @param radius - Radius of sphere (slightly larger than 1 for pinpoint placement)
   * @returns THREE.Vector3 position
   */
  latLngToVector3: (lat: number, lng: number, radius: number = 1.005): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180); // Convert latitude to angle from north pole
    const theta = (lng + 180) * (Math.PI / 180); // Convert longitude to angle, offset by 180°

    // Calculate 3D coordinates using spherical coordinates
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
  },

  /**
   * Converts 3D position to lat/lng coordinates
   * Used when user clicks on Earth to select a location
   * 
   * @param position - 3D position vector
   * @returns {lat, lng} coordinates in degrees
   */
  vector3ToLatLng: (position: THREE.Vector3) => {
    const radius = position.length();
    const phi = Math.acos(position.y / radius);
    const lat = 90 - (phi * 180 / Math.PI);

    // Calculate longitude from x-z plane
    const theta = Math.atan2(position.z, -position.x);
    let lng = (theta * 180 / Math.PI) - 180;

    // Normalize longitude to -180 to 180 range
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  }
};

export default EarthUtils;