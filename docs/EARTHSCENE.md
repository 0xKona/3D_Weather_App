# Earth Scene — How it works

This document explains how the Earth scene is implemented in this project. It is written for engineers who want to understand, extend, or debug the globe renderer. Language is kept simple and practical.

## Contents
- Overview
- File / component structure
- Data flow (textures, uniforms, varyings)
- Shaders (vertex + fragment) — what they do and where to tweak
- Materials and layers (earth, clouds, atmosphere)
- Lighting and time-of-day handling
- Camera and zoom behavior
- Interactions (click to select a location)
- Performance considerations
- Adding nation borders (practical guide)
- What I couldn't infer / follow-ups

---

## Overview

The Earth scene renders a textured 3D globe with a day/night cycle, clouds, atmosphere glow, and a clickable pinpoint marker. The globe uses a custom shader to blend day and night textures, plus specular highlights and a small night ambient lift so features remain readable.

The rendering is done with React Three Fiber (r3f) and Three.js. The globe is a unit sphere (radius = 1) with high subdivision for smoothness.

## File / component structure

- `src/components/scenes/earth-scene.tsx` — top-level Canvas wrapper. Sets up the renderer, maintains the canvas ref, and wires up `CameraController` + `EarthModel`.
- `src/components/scenes/camera-controller.tsx` — calculates camera distance based on viewport and zoom, clamps zoom, prevents camera from entering the globe.
- `src/components/scenes/earth-model.tsx` — the main scene contents: textures, geometry, materials, lights, clouds, atmosphere, and the pinpoint marker.
- `src/components/shaders/vertex.ts` — GLSL vertex shader used by the earth ShaderMaterial.
- `src/components/shaders/fragment.ts` — GLSL fragment shader used by the earth ShaderMaterial.
- `src/components/scenes/scene-utils/earth-utils.ts` — helper functions (sun direction, lat/lng conversions). (If not present, the helpers are inline in `earth-model`.)

## Data flow — textures, uniforms, and varyings

- Textures loaded in `EarthModel`:
  - `dayTexture` (albedo / diffuse / equirectangular world map)
  - `nightTexture` (city lights / emissive map)
  - `specularMap` (water/specular intensity)
  - `bumpMap` (height/bump map)
  - `clouds` (cloud photo with alpha or mask)

- Uniforms passed into the shader (key ones):
  - `sunDirection` (vec3) — normalized vector from the Earth center toward the Sun (controls day/night blending)
  - `bumpScale` (float) — how strongly the bumpMap affects shading

- Varyings (vertex -> fragment):
  - `vUv` — texture coordinates (equirectangular mapping)
  - `vPosition`, `vWorldPosition` — positions for specular/view calculations
  - `vNormal`, `vWorldNormal` — normals used for lighting

Flow: textures and uniforms are set in JS/TS. The vertex shader computes world-space normals and passes UVs/positions down. The fragment shader samples the textures and blends them according to the sun direction.

## Shaders — what they do and where to tweak

Vertex shader (`vertex.ts`):
- Minimal work: pass `uv` and `position`, compute `vWorldNormal` using `mat3(modelMatrix) * normal`, and compute `vWorldPosition`.
- Nothing expensive here — keep it that way.

Fragment shader (`fragment.ts`):
- Samples `dayTexture`, `nightTexture`, and `specularMap`.
- Reconstructs a sphere surface normal from `vUv` to compute `sunDot = dot(surfaceNormal, sunDirection)`.
- Uses `smoothstep` around `sunDot` to create a soft terminator. You can change the `smoothstep` range to tighten or widen the day/night boundary.
- Enhances night lights and adds a small ambient lift on the night side so coastlines and oceans remain visible.
- Adds specular highlights only when `sunDot > 0` (day side) using a half-vector approach.

Where to tweak visual behavior:
- Terminator softness — edit the `smoothstep` thresholds in `fragment.ts`.
- Night brightness — scale the night texture multiplier (look for `enhancedNightColor`).
- Day brightness — tune day color amplification and ambient terms.
- Specular look — adjust power/exponent and specular intensity multiplier.

## Materials and layers

- Earth `ShaderMaterial` — custom vertex/fragment. Fully opaque.
- Clouds `MeshBasicMaterial` — transparent layer, alpha-tested and uses depthWrite true for correct occlusion.
- Atmosphere `MeshPhongMaterial` — BackSide, additive blending, low opacity, gives rim glow.

Order matters: earth mesh -> clouds -> atmosphere. Clouds and atmosphere are separate meshes slightly larger than the Earth sphere.

## Lighting and time-of-day

- Sun direction is calculated by `EarthUtils.getSunDirection(date)` and updated every ~20s.
- `Camera` ambient light is used for overall scene lift; the shader handles the primary day/night blend.
- The directional `sunLight` is primarily for clouds/atmosphere and some scene lighting; the shader is authoritative for the globe itself.

## Camera and zoom

- `CameraController` computes a base distance so the globe fits the viewport using the camera FOV and viewport size.
- Zoom is clamped to `[1.0, 1.2]` (1.0 = default, 1.2 = max). The controller enforces a minimum camera distance so the camera can't go inside the globe.
- The `Canvas` element uses `style={{ overflow: 'visible' }}` so the globe can extend visually beyond its parent container boundaries when zoomed.

## Interactions

- Double-click on the globe triggers `onPointerDown` in `EarthModel`, which converts the clicked 3D position to lat/lng and calls the `onLocationSelect` callback.

## Performance considerations

- Keep the fragment shader branch-free where possible. Avoid loops or complex conditionals.
- Textures are configured with anisotropy and mipmaps. Large textures (10k) are used; profile memory usage if targeting low-memory devices.
- Dispose of textures and materials on unmount (the code already does this in a cleanup effect).

## To Do - Adding nation borders (practical guide)

Two approaches:

1) Overlay texture (recommended)
- Create an equirectangular PNG with transparent background where borders are drawn (same resolution/aspect as your `dayTexture`).
- Load it as `bordersTexture` and add a uniform to the fragment shader. Sample `b = texture2D(bordersTexture, vUv)` and blend `baseColor = mix(baseColor, borderColor, b.a * intensity)`.
- Pros: editable, non-destructive, easy to toggle.

2) Bake borders into `dayTexture`
- Open your day map in an editor, paste borders into the day map, and save.
- Pros: simple, no shader changes. Cons: destructive and less flexible.

How to produce an overlay from vector data:
- Use Natural Earth (public domain) for country boundaries.
- Use QGIS: load shapefile → style border lines → export as equirectangular PNG at target size (match day texture resolution) with transparent background.
- Or use GDAL to rasterize GeoJSON to EPSG:4326 raster matching your dayTexture dimensions.
