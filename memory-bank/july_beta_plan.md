# July 3D Beta Milestone: The Tomographic Observer (Volumetric 3D Image-Slice Stack)

## 1. Core Vision ("Brain-Scan" Volumetric 3D World)
For the **July 3D Beta**, the 3D world and Crow's Eye supercluster map will be constructed using **thousands of stacked 2D image slices in 3D space**—analogous to a medical MRI/CT brain scan (tomographic volumetric rendering) where thousands of cross-sectional slices combine to form a living, inspectable 3D volume.

This directly mirrors the **Isomorphic 4D Fractal Cosmology**:
- Each 2D slice represents a spatial or temporal cross-section of Aethelgard (the Central Dark Forest Attractor, the 100-mile Mountain Event Horizon, and the Endless Dunes Laniakea streamlines).
- Stacking thousands of slices along the depth axis turns the 14-day Shift and multi-century history into an inspectable 3D geological/tomographic volume.

---

## 2. The 3-Layer Hybrid Tomographic Pipeline

To maximize both visual fidelity and 60+ FPS browser/mobile performance, the **July 3D Beta** will use a **Hybrid Approach** combining pre-flattened 3D asset stacks, real-time GPU mesh slicing, and procedural cosmological fields inside a unified 3D volume:

### Layer 1: Pre-Baked High-Poly 3D Asset Slice Atlases (`tools/slice_3d_assets.mjs` / Headless Blender or Three.js Baker)
- **What it handles:** Massive, static or semi-static high-polygon 3D assets (`.glb`, `.gltf`, `.obj`, `.fbx`) such as the 20 Chained Bedrock Settlements, *World's End Gate*, the 50-ton bedrock anchor chains, the 100-mile Mountain Ring Event Horizon, and ancient subterranean ruins.
- **How it works:** An automated offline slicer steps an orthographic clipping window (`near` / `far` sandwich) across each 3D asset and flattens it into a compressed 2D Texture Atlas / `Data3DTexture` stack (e.g., 512–1,024 cross-sectional slices).
- **Advantage:** A 50,000,000-triangle sculpted 3D asset costs the **exact same runtime GPU memory and draw time** as a simple cube once flattened into a slice atlas, allowing players to peel open fortresses and mountains like an MRI scan to see internal rooms, roots, and chains.

### Layer 2: Real-Time In-Browser GPU Slicing (`WebGLRenderTarget` Orthographic Slicer)
- **What it handles:** Dynamic 3D assets placed or moving at runtime—such as active Field Caravans, Risen Feral Wendigos, the 5 mutated Frost-Heralds, newly constructed settlement facilities (`guard_barracks`, `war_table`, `crow_loft`), and squad war-table markers.
- **How it works:** When a 3D asset spawns, upgrades, or moves, an offscreen Three.js `WebGLRenderTarget` slices the `.glb` model on the GPU in `<50ms` and composites those dynamic slices directly into the active volumetric stack.
- **Advantage:** Dynamic units and newly built facilities naturally inherit the exact same tomographic "brain-scan" aesthetic—including slice-shearing when a 14-day Shift hits.

### Layer 3: Procedural Cosmological & "Grammar of Chaos" Shader Slices
- **What it handles:** Living environmental and systemic forces from `src/core/commander_engine.js`—the inward-flowing Laniakea dendritic subterranean rivers in the Endless Dunes, the 7-day White Void mist, and 3-way `ProceduralCollisionEngine` pressure anomalies.
- **How it works:** A custom GLSL volumetric fragment shader composites procedural 4D simplex/curl noise streamlines and `RenderStateManifest` telemetry directly across the Z-slices.
- **Advantage:** When a 14-day Shift or *Grammar of Chaos* collision erupts, the shader can horizontally shear, glitch, or illuminate specific slice depths (e.g., highlighting the exact subterranean aquifer slice or bedrock chain layer where the failure occurred).

---

## 3. Runtime Execution: "The Brain" vs. "The Hybrid Scanner"

1. **The Brain (`src/core/commander_engine.js` in a Web Worker):**
   - Continues running 100% headlessly at zero-DOM speed (capable of 1,000 years in <3 seconds).
   - Never blocks on 3D asset loading or WebGL draw calls.
2. **The Bridge (`RenderStateManifest`):**
   - On each 14-day Shift, Facility unlock, Expedition step, or `PROCEDURAL_COLLISION_EXECUTED` event, the engine emits a compact JSON state diff (`sliceIndex`, `settlementVectors`, `dynamicAssetTransforms`, `activeCollisionTags`, `entropyLevel`, `rotRadius`).
3. **The Hybrid Scanner (Three.js `InstancedMesh` + `Data3DTexture` / `DataArrayTexture`):**
   - Renders the entire 1,000+ slice hybrid stack in **a single instanced GPU draw call**, complete with interactive X/Y/Z tomographic clipping sliders (allowing the Commander to scrub vertically from deep bedrock aquifers up through the canopy and into the Crow's Eye supercluster view).

---

## 4. Guardrail Alignment
- Per `.clinerules` (**Player-Facing Systems Frozen until July Push**), this document serves as the locked architectural blueprint for the **July 3D Beta** push while keeping all current headless and `ledger-mobile/` simulation systems pure and zero-DOM.
