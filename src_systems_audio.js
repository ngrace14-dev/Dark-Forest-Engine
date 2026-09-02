window.AudioManager = {
    pannerNodes: {},
    play: function(url, pos, vol=0) {
        if(!window.Tone) return;
        if(!this.pannerNodes[url]) {
            const panner = new window.Tone.Panner3D({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2, maxDistance: 30 }).toDestination();
            const player = new window.Tone.Player(url).connect(panner); player.volume.value = vol; this.pannerNodes[url] = { player, panner };
        }
        const node = this.pannerNodes[url];
        if(node.player.loaded) { node.panner.positionX.value = pos.x; node.panner.positionY.value = pos.y; node.panner.positionZ.value = pos.z; node.player.start(); }
    }
};
window.EventBus.on('PLAY_SOUND', ({url, pos, vol}) => window.AudioManager.play(url, pos, vol));
