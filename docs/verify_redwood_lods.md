# Redwood Procedural LOD & Shader Verification

This document outlines the strict protocol for visually and programmatically verifying the Dark Forest Engine's procedural Redwood pipeline, including the Flared Buttress Base, SSS Canopy, Impostor Atlas generation, and VRAM memory stability.

## Phase 1: Visual Verification

Boot the engine and enter the world. Fly through the dense forest and verify the following visual checkpoints:

### 1. 3D Procedural Shader Integrity
- **Flared Buttress Base:** Look at the base of several redwood trunks. The geometry should noticeably flare outward into irregular root lobes where it meets the soil. Each tree should have a slightly unique flare shape (driven by the deterministic seed).
- **Trunk Gradient & Furrows:** Fly upward along the trunk. Observe the deep bark crevices reacting to ambient light/AO. Verify the color gradient: Soil Brown at the roots, transitioning to Cinnamon Red midway, and lightening to Golden tips near the top.
- **Canopy Subsurface Scattering (SSS):** Position the camera so the sun is directly behind a dense cluster of foliage. You should observe a warm, internal scattered glow penetrating the quad clusters, simulating needle thickness.
- **Canopy Alpha Masking:** Verify that the quad clusters are cleanly carved out into needle shapes without soft, muddy edges or volumetric fog depth-sorting artifacts.

### 2. Impostor LOD Transition
- **Seamless Swap:** Fly backward away from a distinct 3D tree until it crosses the `uMinRadius` threshold (LOD3 to LOD4).
- **Visual Match:** The 3D mesh should pop into a 2D quad (Impostor), but the visual profile (trunk shape, canopy gaps, color gradient) should remain nearly identical because the 2D atlas was baked using the exact same procedural seed and lighting logic.
- **Time of Day Shading:** The impostor quad should be correctly shaded matching the active sun direction and color.

## Phase 2: Telemetry & Memory Verification

Open the browser developer console (F12) while navigating the world and execute the following commands to verify system stability and adherence to the Observability Rule.

### 1. Active Render Metrics
While hovering in the center of the dense forest, execute:
```javascript
console.log(window.ForestDebug.getRendererTelemetry());
console.log(window.ForestDebug.getImpostorTelemetry());
```
**Expected Outcome:**
- `activeChunks` should match the expected loaded grid size.
- `total3DTreeInstances` should represent thousands of high-poly trees.
- `active2DImpostors` should represent tens to hundreds of thousands of distant trees.
- `atlasStatus` must be `"Loaded"` and `atlasResolution` should display a valid texture size (e.g., `2048x2048`), confirming the `ImpostorBaker` executed successfully at startup.

### 2. VRAM Leakage & Disposal Test
Fly rapidly out of bounds (far away from the generated forest terrain) into empty space. 
Wait a few moments for the chunk manager to cull the distant terrain, then execute:
```javascript
console.log(window.ForestDebug.getRendererTelemetry());
```
**Expected Outcome:**
- `activeChunks` must drop significantly or to `0`.
- `total3DTreeInstances` must drop to `0`.
- If instances or chunks remain stubbornly high in empty space, a memory leak exists in the `dispose()` or chunk clearing logic. 

**STAMP CRITERIA:** Once visual checkpoints pass and telemetry confirms zero VRAM leakage on chunk disposal, the system is officially VERIFIED.