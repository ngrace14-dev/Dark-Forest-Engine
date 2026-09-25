# Tidewater System Verification

This document outlines the strict protocol for visually and programmatically verifying the Dark Forest Engine's procedural Tidewater System (Ocean Rendering pipeline).

## Phase 1: Visual Verification

Boot the engine and navigate to an open coastline or descend to the default sea level (-10.0 Y). Verify the following visual checkpoints:

### 1. 3D Gerstner Wave Displacement
- **Wave Architecture:** The surface should physically undulate, not just visually. You should see sharp, peaking crests and wide, smooth troughs (a hallmark of Gerstner mathematics vs standard Sine waves).
- **Organic Chaos:** The surface should appear chaotic and non-repeating due to the 4 distinct overlapping wave vectors (Primary Swell, Cross-Swell, and High-frequency chops).

### 2. Fragment Shading & Lighting
- **Analytical Normals:** The surface lighting must match the physical displacement geometry. Crests should catch the light, while the backsides of waves should be shadowed.
- **Depth-Based Color:** The peaks of the waves should be a bright, shallow teal (`uWaterShallow`), smoothly transitioning into a dark navy (`uWaterDeep`) within the deep troughs.
- **Fresnel Reflections:** When looking out at the horizon (glancing camera angles), the water surface should become highly reflective and mirror the sky color. When looking straight down, it should remain dark and transparent.
- **Specular Glints:** The sun should generate sharp, intense specular highlights bounding across the moving wave peaks.
- **Procedural Foam:** Organic, broken-up white foam should dynamically appear *only* at the highest and sharpest peaks of the waves, fading out as the wave subsides.

## Phase 2: Telemetry & Memory Verification

Open the browser developer console (F12) while navigating the world and execute the following command to verify system stability and adherence to the Observability Rule.

### 1. Active Render Metrics
While viewing the ocean, execute:
```javascript
console.log(window.ForestDebug.getTidewaterTelemetry());
```
**Expected Outcome:**
- `isInitialized`: `true`
- `isRendering`: `true` (Confirms the mesh is attached to the active scene graph)
- `meshActive`: `true`
- `vertexCount`: Should be exactly `263169` (512x512 grid subdivisions). 
- `faceCount`: Should be exactly `524288` (512 * 512 * 2 triangles).
- `simulationTime`: A float that steadily increases with the engine clock.
- `waveCount`: `4`

### 2. VRAM Leakage & Disposal Test
Currently, the ocean is a static global plane, so it will not cull dynamically like chunks. However, if testing a world-unload or scene-swap event, verify disposal by executing:
```javascript
window.GameCore.tidewaterSystem.dispose();
console.log(window.ForestDebug.getTidewaterTelemetry());
```
**Expected Outcome:**
- `isInitialized`: `false`
- `meshActive`: `false`
- `vertexCount`: `0`
- `faceCount`: `0`

**STAMP CRITERIA:** Once visual checkpoints pass and telemetry confirms the dense vertex payload is rendering and disposing cleanly without VRAM leaks, the system is officially VERIFIED.