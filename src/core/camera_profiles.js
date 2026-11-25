// ============================================================================
// Dark Forest Engine - Camera Profiles (Crow's Eye vs. Classic Isometric RTS)
// File: src/core/camera_profiles.js
// ============================================================================

const rootScope = typeof window !== 'undefined' ? window : globalThis;

export const CameraProfiles = {
    CROWS_EYE: {
        id: 'CROWS_EYE',
        label: "Crow's Eye (Dynamic 3D Perspective)",
        pitch: 0.4,
        angle: Math.PI,
        distance: 15,
        fov: 75,
        lockOrbit: false,
        lockZoom: false,
        targetHeightOffset: 1.5,
        shadowFrustumSize: 100,
        shadowSunOffset: { x: 20, y: 60, z: 20 },
        fogDensity: 0.0018,
        impostorMinRadius: 480.0,
        impostorMaxRadius: 3500.0
    },
    CLASSIC_ISOMETRIC: {
        id: 'CLASSIC_ISOMETRIC',
        label: 'Classic Isometric (AoE2 / Mobile Tactical Projection)',
        pitch: Math.PI / 4,        // 45-degree high-angle elevation
        angle: Math.PI / 4,        // 45-degree NE diamond isometric orientation
        distance: 42,              // Elevated tactical standoff distance for low-FOV projection
        fov: 25,                   // Low FOV flattens perspective distortion to mimic orthographic RTS projection
        lockOrbit: true,
        lockZoom: false,
        minDistance: 24,
        maxDistance: 68,
        targetHeightOffset: 1.0,
        shadowFrustumSize: 75,     // Tighter shadow map frustum for crisp settlement walls & stalking lanes
        shadowSunOffset: { x: 45, y: 85, z: -35 }, // Fixed diagonal RTS sun angle
        fogDensity: 0.0009,        // Reduced ground haze so woodland stalking lanes & walls read clearly
        impostorMinRadius: 320.0,  // Tighter LOD transition for isometric viewport
        impostorMaxRadius: 2400.0
    }
};

export function getActiveCameraProfile(modeOverride = null) {
    const mode = modeOverride
        || rootScope.EngineParams?.cameraMode
        || rootScope.Input?.cameraMode
        || 'CLASSIC_ISOMETRIC';
    return CameraProfiles[mode] || CameraProfiles.CLASSIC_ISOMETRIC;
}

export function applyCameraProfile(mode = 'CLASSIC_ISOMETRIC') {
    const profile = getActiveCameraProfile(mode);

    if (rootScope.EngineParams) {
        rootScope.EngineParams.cameraMode = profile.id;
        rootScope.EngineParams.fogDensity = profile.fogDensity;
    }

    if (rootScope.Input) {
        rootScope.Input.cameraMode = profile.id;
        rootScope.Input.isLockedPerspective = Boolean(profile.lockOrbit);
        rootScope.Input.camPitch = profile.pitch;
        rootScope.Input.camAngle = profile.angle;
        rootScope.Input.camDistance = profile.distance;
    }

    const cam = rootScope.GameCore?.camera;
    if (cam && typeof cam.updateProjectionMatrix === 'function') {
        if (cam.fov !== profile.fov) {
            cam.fov = profile.fov;
            cam.updateProjectionMatrix();
        }
    }

    if (rootScope.VolumetricFogSystem?.fogUniforms?.uFogDensity) {
        rootScope.VolumetricFogSystem.fogUniforms.uFogDensity.value = profile.fogDensity;
    }

    if (rootScope.ForestImpostorSystem?.uniforms) {
        rootScope.ForestImpostorSystem.uniforms.uMinRadius.value = profile.impostorMinRadius;
        rootScope.ForestImpostorSystem.uniforms.uMaxRadius.value = profile.impostorMaxRadius;
        rootScope.ForestImpostorSystem.uniforms.uFogDensity.value = profile.fogDensity;
    }

    const dirLight = rootScope.RenderPipeline?.dirLight;
    if (dirLight && dirLight.shadow && dirLight.shadow.camera) {
        const s = profile.shadowFrustumSize;
        dirLight.shadow.camera.left = -s;
        dirLight.shadow.camera.right = s;
        dirLight.shadow.camera.top = s;
        dirLight.shadow.camera.bottom = -s;
        dirLight.shadow.camera.updateProjectionMatrix?.();
    }

    rootScope.EventBus?.emit?.('CAMERA_PROFILE_CHANGED', { mode: profile.id, profile });
    return profile;
}

rootScope.CameraProfiles = CameraProfiles;
rootScope.getActiveCameraProfile = getActiveCameraProfile;
rootScope.applyCameraProfile = applyCameraProfile;

export default CameraProfiles;
