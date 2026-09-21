import * as Tone from 'tone';

class ProceduralAudioEngine {
    constructor() {
        this.isInitialized = false;
        this.synths = {};
    }

    init() {
        if (this.isInitialized) return;

        // 1. Procedural Snare / Impact Synth (Replaces snare-analog.mp3)
        this.synths.impact = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0 }
        }).toDestination();

        // 2. Procedural Sub-Thud Synth (Weapon Hits)
        this.synths.thud = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
        }).toDestination();

        // 3. Ambient Forest Breeze Oscillator
        this.synths.breeze = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 2.0, decay: 1.0, sustain: 1.0, release: 2.0 }
        }).toDestination();
        this.synths.breeze.volume.value = -24;

        this.isInitialized = true;
        console.log("🔊 [AudioEngine] Procedural WebAudio Synthesizers Initialized.");
    }

    playHitSound(type = 'impact') {
        if (!this.isInitialized) return;
        if (type === 'heavy') {
            this.synths.thud.triggerAttackRelease('C1', '8n');
            this.synths.impact.triggerAttackRelease('16n');
        } else {
            this.synths.thud.triggerAttackRelease('G1', '16n');
        }
    }

    startAmbientBreeze() {
        if (!this.isInitialized) return;
        this.synths.breeze.triggerAttack();
    }
}

window.AudioEngine = new ProceduralAudioEngine();

window.EventBus?.on('GAME_STARTED', async () => {
    try {
        await Tone.start();
        window.AudioEngine.init();
        window.AudioEngine.startAmbientBreeze();
    } catch (e) {
        console.warn('Audio start delayed until user gesture.', e);
    }
});

window.EventBus?.on('ENTITY_DAMAGED', (data) => {
    window.AudioEngine.playHitSound(data.damage > 20 ? 'heavy' : 'light');
});
