import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

/**
 * Mixamo Animation Retargeting Pipeline
 * Designed to separate animation processing from core asset loading
 * to prevent architectural rot and keep systems modular.
 */
window.AnimationPipeline = {

    /**
     * Cleans and retargets Mixamo animations to work smoothly 
     * on standard Three.js rigged characters.
     * Removes the 'mixamo.com' prefix from bones if necessary.
     * 
     * @param {THREE.AnimationClip} clip - The raw animation clip
     * @returns {THREE.AnimationClip} - The cleaned animation clip
     */
    sanitizeMixamoClip: function(clip) {
        // Create a clone to avoid mutating the original globally loaded asset
        const cleanClip = clip.clone();
        
        cleanClip.tracks.forEach(track => {
            // Mixamo tracks usually look like "mixamorigHips.position"
            // If the base skeleton doesn't have the 'mixamorig' prefix, this fixes the bind
            track.name = track.name.replace('mixamorig', '');
            
            // Mixamo also sometimes binds root movement to a parent 'mixamo.com' node
            // This strips that specific parent node mapping if it exists
            if (track.name.includes('mixamo.com')) {
                track.name = track.name.replace('mixamo.com', '');
            }
        });
        
        return cleanClip;
    },

    /**
     * Finds and extracts a specific Mixamo animation from an array of clips
     */
    extractMixamoAnimation: function(animations) {
        const clip = THREE.AnimationClip.findByName(animations, 'mixamo.com');
        if (clip) {
            return this.sanitizeMixamoClip(clip);
        }
        return null;
    }
};

window.SystemRegistry.register('AnimationPipeline', window.AnimationPipeline);
console.log("🎬 Animation Pipeline Initialized");
