
import { renderVexFlowNotes } from './score-renderer.js';
import { noteStrings } from './data.js';
import { appState } from './state.js';

// --- AUDIO ENGINE ---

let audioCtx = null;
let micStream = null;
let analyser = null;
let micBuffer = null;
let pitchLoopId = null;

// Callbacks for pitch detection results
let onPitchDetected = null;

export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function playBrassTone(freq) {
    const ctx = initAudio();
    const t = ctx.currentTime;
    const duration = 0.6;
    const isTrumpet = appState.selectedInstrument === 'trumpet';
    
    console.log(`Audio: Playing ${freq}Hz. Instrument: ${isTrumpet ? 'TRUMPET' : 'TROMBONE'}`);

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    
    // Attack/Decay Envelopes
    if (isTrumpet) {
        // TRUMPET: Fast, biting attack
        masterGain.gain.linearRampToValueAtTime(0.6, t + 0.03); 
        masterGain.gain.exponentialRampToValueAtTime(0.3, t + 0.2); // Decay to sustain
        masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    } else {
        // TROMBONE: Slow, swelling attack
        masterGain.gain.linearRampToValueAtTime(0.6, t + 0.1); 
        masterGain.gain.exponentialRampToValueAtTime(0.5, t + 0.4); 
        masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    }
    masterGain.connect(ctx.destination);

    // --- INSTRUMENT SYNTHESIS ---

    if (isTrumpet) {
        // === TRUMPET SYNTHESIS (Bright, Thin, Nasal) ===
        
        // Osc 1: Sawtooth (The buzz)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = freq;

        // Osc 2: Sawtooth (Detuned slightly for phasing)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = freq;
        osc2.detune.value = 3; 

        // Filter Chain: Highpass -> Peaking -> Lowpass
        
        // 1. Highpass: Cut the "body" to make it thinner
        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 300; 

        // 2. Peaking: Boost the "bell" frequencies (Nasal quality)
        const peakFilter = ctx.createBiquadFilter();
        peakFilter.type = 'peaking';
        peakFilter.frequency.value = 2500;
        peakFilter.Q.value = 1.5;
        peakFilter.gain.value = 12; // High boost

        // 3. Lowpass: The "Blare" envelope
        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.Q.value = 2.0; // Resonant
        
        // Envelope: Open wide and close
        lpFilter.frequency.setValueAtTime(freq * 3, t);
        lpFilter.frequency.linearRampToValueAtTime(freq * 9, t + 0.05); // Snap open
        lpFilter.frequency.exponentialRampToValueAtTime(freq * 4, t + duration);

        // Connections
        osc1.connect(hpFilter);
        osc2.connect(hpFilter);
        
        hpFilter.connect(peakFilter);
        peakFilter.connect(lpFilter);
        lpFilter.connect(masterGain);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + duration);
        osc2.stop(t + duration);

    } else {
        // === TROMBONE SYNTHESIS (Warm, Round, Full) ===
        
        // Osc 1: Sawtooth (Body)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = freq;

        // Osc 2: Triangle (Warmth/Roundness)
        // Mixing in a triangle wave softens the jagged edges of the sawtooth
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle'; 
        osc2.frequency.value = freq;
        osc2.detune.value = 5; // Slight chorus

        // Filter: Simple Lowpass, no resonance
        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.Q.value = 0.5; // Damped
        
        // Envelope: Mellow opening
        lpFilter.frequency.setValueAtTime(freq * 1.5, t);
        lpFilter.frequency.linearRampToValueAtTime(freq * 3.5, t + 0.2); // Slow opening
        lpFilter.frequency.exponentialRampToValueAtTime(freq * 2.0, t + duration);

        // Connections
        osc1.connect(lpFilter);
        osc2.connect(lpFilter);
        lpFilter.connect(masterGain);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + duration);
        osc2.stop(t + duration);
    }
}

export function playSingleNote(note) {
    playBrassTone(note.freq);
    renderVexFlowNotes("learnStaff", [note.key]);
}

// --- MICROPHONE LOGIC (ml5.js) ---

let pitchDetector = null;

export async function startMicrophone(detectionCallback) {
    try {
        const ctx = initAudio();
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // ml5 Pitch Detection Init
        const audioContext = ctx;
        const mic = micStream;
        
        console.log("Loading ml5 pitch detection model...");
        pitchDetector = ml5.pitchDetection('https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/', audioContext, micStream, () => {
            console.log("Model Loaded!");
            onPitchDetected = detectionCallback;
            processPitch();
        });

        return true;
    } catch (e) {
        console.error("Mic Error:", e);
        // ... Error handling remains similar ...
        let errorMsg = "Mikrofon-Zugriff nicht möglich.";
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            errorMsg = "⚠️ Mikrofon-Zugriff verweigert.\n\nBitte erlaube den Zugriff in deinen Browser-Einstellungen.";
        } else if (e.name === 'NotFoundError') {
            errorMsg = "⚠️ Kein Mikrofon gefunden.\n\nBitte schließe ein Mikrofon an.";
        } else if (e.name === 'NotSupportedError') {
            errorMsg = "⚠️ Dein Browser unterstützt diese Funktion nicht.\n\nVerwende Chrome, Firefox oder Safari.";
        } else if (e.name === 'NotReadableError') {
            errorMsg = "⚠️ Mikrofon wird bereits verwendet.\n\nSchließe andere Apps, die das Mikrofon nutzen.";
        }
        alert(errorMsg);
        return false;
    }
}

export function stopMicrophone() {
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    // Stop recursive call implies just clearing callback or state, 
    // ml5 doesn't have a clear "stop" loop method other than not calling getPitch again.
    onPitchDetected = null;
    pitchDetector = null;
}

function processPitch() {
    if (!pitchDetector || !onPitchDetected) return;

    pitchDetector.getPitch((err, frequency) => {
        if (frequency) {
            const note = noteFromPitch(frequency);
            const noteName = noteStrings[note % 12];
            const octave = Math.floor(note / 12) - 1;
            const detune = centsOffFromPitch(frequency, note);

            onPitchDetected({
                freq: Math.round(frequency),
                noteName: noteName,
                octave: octave,
                cents: detune,
                detected: true
            });
        } else {
            onPitchDetected({ detected: false });
        }
        
        if (pitchDetector) {
            processPitch(); // Loop
        }
    });
}

// --- MATH HELPERS ---

function noteFromPitch(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

function centsOffFromPitch(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}
