const { Renderer, Stave, StaveNote, Accidental, Formatter, Voice, Clef } = Vex.Flow;

// --- GAMIFICATION STATE ---
let userProgress = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    streak: 0,
    lastLogin: null,
    highScore: 0
};

let currentQuizQuestion = null;
let quizActive = true;
let currentSliderSelection = 1;
let lastLearnRenderedNote = null;
let currentLearnPosInt = 1;

// --- DATENBASIS (C-Dur Anfänger) ---
const positionMap = {
    1: [
        { text: "F", key: "f/3", level: 1, isBeginner: true, freq: 174.61 },
        { text: "B", key: "bb/2", level: 2, freq: 116.54 },
        { text: "b", key: "bb/3", level: 3, freq: 233.08 },
        { text: "Ais", key: "a#/2", level: 2, freq: 116.54 },
        { text: "ais", key: "a#/3", level: 3, freq: 233.08 }
    ],
    2: [
        { text: "E", key: "e/3", level: 1, isBeginner: true, freq: 164.81 },
        { text: "A", key: "a/3", level: 1, isBeginner: true, freq: 220.00 },
        { text: "A (tief)", key: "a/2", level: 2, freq: 110.00 },
    ],
    3: [
        { text: "C'", key: "c/4", level: 1, isBeginner: true, freq: 261.63 },
        { text: "Es", key: "eb/3", level: 2, freq: 155.56 },
        { text: "As", key: "ab/2", level: 2, freq: 103.83 },
        { text: "as", key: "ab/3", level: 3, freq: 207.65 },
        { text: "Gis", key: "g#/2", level: 2, freq: 103.83 },
        { text: "gis", key: "g#/3", level: 3, freq: 207.65 },
        { text: "Dis", key: "d#/3", level: 2, freq: 155.56 }
    ],
    4: [
        { text: "D", key: "d/3", level: 1, isBeginner: true, freq: 146.83 },
        { text: "G", key: "g/3", level: 1, isBeginner: true, freq: 196.00 },
        { text: "H", key: "b/3", level: 1, isBeginner: true, freq: 246.94 },
        { text: "G (tief)", key: "g/2", level: 2, freq: 98.00 }
    ],
    5: [
        { text: "Des", key: "db/3", level: 2, freq: 138.59 },
        { text: "Ges", key: "gb/2", level: 2, freq: 92.50 },
        { text: "ges", key: "gb/3", level: 3, freq: 185.00 },
        { text: "Cis", key: "c#/3", level: 2, freq: 138.59 },
        { text: "Fis", key: "f#/2", level: 2, freq: 92.50 },
        { text: "fis", key: "f#/3", level: 3, freq: 185.00 }
    ],
    6: [
        { text: "C", key: "c/3", level: 1, isBeginner: true, freq: 130.81 },
        { text: "F (tief)", key: "f/2", level: 2, freq: 87.31 }
    ],
    7: [
        { text: "H", key: "b/2", level: 2, freq: 123.47 },
        { text: "E", key: "e/2", level: 2, freq: 82.41 }
    ]
};

// --- GAMIFICATION LOGIC ---
function initGamification() {
    const saved = localStorage.getItem('posauneProgress');
    if (saved) {
        userProgress = JSON.parse(saved);
    } else {
        // Migration old highscore
        const oldHigh = localStorage.getItem('posauneHighScore');
        if (oldHigh) userProgress.highScore = parseInt(oldHigh);
    }

    checkDailyStreak();
    updateUIStats();
}

function saveProgress() {
    localStorage.setItem('posauneProgress', JSON.stringify(userProgress));
    updateUIStats();
}

function checkDailyStreak() {
    const today = new Date().toDateString();
    if (userProgress.lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (userProgress.lastLogin === yesterday.toDateString()) {
            userProgress.streak++;
        } else if (userProgress.lastLogin !== today) {
            // Streak broken (but keep 1 for today)
            // Only reset if it wasn't just first login
            if (userProgress.lastLogin) userProgress.streak = 1;
            else userProgress.streak = 1;
        }
        userProgress.lastLogin = today;
        saveProgress();
    }
}

function addXP(amount) {
    userProgress.xp += amount;
    if (userProgress.xp >= userProgress.xpToNext) {
        levelUp();
    }
    saveProgress();
}

function levelUp() {
    userProgress.level++;
    userProgress.xp -= userProgress.xpToNext;
    userProgress.xpToNext = Math.floor(userProgress.xpToNext * 1.5);

    // Visual Feedback
    alert(`🎉 LEVEL UP! Du bist jetzt Level ${userProgress.level}! Neue Töne freigeschaltet.`);
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
}

function updateUIStats() {
    const lvlEl = document.getElementById('displayLevel');
    const xpEl = document.getElementById('displayXP');
    const streakEl = document.getElementById('displayStreak');
    const xpBar = document.getElementById('xpProgressBar');

    if (lvlEl) lvlEl.innerText = userProgress.level;
    if (streakEl) streakEl.innerText = userProgress.streak;

    if (xpBar) {
        const pct = (userProgress.xp / userProgress.xpToNext) * 100;
        xpBar.style.width = `${pct}%`;
    }
}

// --- LOGIC: Questions based on Level ---
function getAllowedPositions(lvl) {
    if (lvl === 1) return [1, 2];
    if (lvl === 2) return [1, 2, 3, 4];
    return [1, 2, 3, 4, 5, 6, 7];
}

function getNotesForPosition(p, lvl) {
    if (!positionMap[p]) return [];
    // Level 1: Nur Beginner Notes
    if (lvl === 1) return positionMap[p].filter(n => n.isBeginner);
    // Level 2: Beginner + einfache Level 2
    if (lvl === 2) return positionMap[p].filter(n => n.level <= 2);
    // Level 3+: Alles
    return positionMap[p];
}

function generateQuestionsForLevel(lvl) {
    let q = [];
    const allowedPos = getAllowedPositions(lvl);

    allowedPos.forEach(pos => {
        const notes = getNotesForPosition(pos, lvl);
        notes.forEach(n => {
            q.push({
                noteName: n.text,
                correct: pos,
                key: n.key,
                freq: n.freq
            });
        });
    });
    return q;
}

// --- AUDIO ENGINE ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playBrassTone(freq) {
    const ctx = initAudio();
    const t = ctx.currentTime;
    const duration = 0.6;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.5, t + 0.08); // Weicherer Attack
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    masterGain.connect(ctx.destination);

    // Oscillator 1 (Sawtooth - Kern)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;

    // Oscillator 2 (Sawtooth - Breite/Chor)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq;
    osc2.detune.value = 4; // Leicht verstimmt für Breite

    // Filter (Lowpass - das "Messing" Gefühl)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.5;
    // Filter öffnet sich beim Anblasen (Wah-Effekt minimiert, eher "Bwaaah")
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.frequency.linearRampToValueAtTime(freq * 4, t + 0.1);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, t + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration);
    osc2.stop(t + duration);
}

function playSingleNote(note) {
    playBrassTone(note.freq);
    renderVexFlowNotes("learnStaff", [note.key]);
}

function playQuizHint() {
    if (currentQuizQuestion) {
        playBrassTone(currentQuizQuestion.freq);
    }
}

function renderVexFlowNotes(id, keys, isGhost = false) {
    const div = document.getElementById(id); if (!div) return; div.innerHTML = "";
    if (isGhost) div.classList.add('grayscale-staff'); else div.classList.remove('grayscale-staff');
    const r = new Renderer(div, Renderer.Backends.SVG); r.resize(350, 150);
    const ctx = r.getContext(); ctx.scale(1.5, 1.5);
    const s = new Stave(10, 10, 210); s.addClef("bass"); s.setContext(ctx).draw();
    const n = new StaveNote({ keys: keys, duration: "w", clef: "bass", align_center: true });
    if (isGhost) n.setStyle({ fillStyle: "#999", strokeStyle: "#999" });
    keys.forEach((k, i) => { if (k.includes('b')) n.addModifier(new Accidental('b'), i); if (k.includes('#')) n.addModifier(new Accidental('#'), i); });
    const v = new Voice({ num_beats: 4, beat_value: 4 }); v.addTickables([n]);
    new Formatter().joinVoices([v]).format([v], 150); v.draw(ctx, s);
    div.querySelector('svg').setAttribute('viewBox', '0 0 350 150');
    div.querySelector('svg').style.width = "100%"; div.querySelector('svg').style.height = "100%";
}

function handleQuizInput(val) {
    const pos = parseFloat(val);
    currentSliderSelection = pos;
    updateVisuals('quiz', pos);
    const rounded = Math.round(pos);
    document.getElementById('quizCurrentSelection').innerText = "Position " + rounded;

    // Show notes for this position (nur als Info, nicht Lösung verraten wenn Quiz läuft? 
    // Aktuell zeigt es Töne an, das ist okay als Lernhilfe während des Ziehens)
    const notes = getNotesForPosition(rounded, userProgress.level);
    const noteText = notes.length > 0 ? notes.map(n => n.text).join(', ') : "-";
    const notesDiv = document.getElementById('quizNotesOnPosition');
    if (notesDiv) notesDiv.innerText = `(Töne hier: ${noteText})`;

    highlightMarker('quiz', rounded);
}

// --- KEYBOARD CONTROLS ---
document.addEventListener('keydown', (e) => {
    // Only if not typing in an input (though we don't have text inputs really)
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;

    const isQuiz = !document.getElementById('view-trainer').classList.contains('d-none') &&
        document.getElementById('pills-quiz-tab').classList.contains('active');
    const isLearn = !document.getElementById('view-trainer').classList.contains('d-none') &&
        document.getElementById('pills-learn-tab').classList.contains('active');

    if (!isQuiz && !isLearn) return;

    const sliderId = isQuiz ? 'quizSlideRange' : 'learnSlideRange';
    const slider = document.getElementById(sliderId);
    let currentVal = parseFloat(slider.value);

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        let next = Math.min(7, Math.round(currentVal + 1));
        if (isQuiz) snapQuizInput(next);
        else setLearnPosition(next);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let prev = Math.max(1, Math.round(currentVal - 1));
        if (isQuiz) snapQuizInput(prev);
        else setLearnPosition(prev);
    } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isQuiz) {
            // If check button is visible, click it
            if (document.getElementById('checkAnswerBtn').style.display !== 'none') {
                checkQuizAnswer();
            } else if (document.getElementById('nextBtn').style.display !== 'none') {
                nextQuestion();
            }
        } else if (isLearn) {
            playCurrentLearnTone();
        }
    }
});
function snapQuizInput(val) {
    const rounded = Math.round(val);
    document.getElementById('quizSlideRange').value = rounded;
    handleQuizInput(rounded);
}

function handleLearnInput(val) {
    const pos = parseFloat(val);
    updateVisuals('learn', pos);
    const rounded = Math.round(pos);

    // INTERACTIVE NOTES GENERATION
    const container = document.getElementById('learnNoteInteraction');
    container.innerHTML = '';

    // Alle verfügbaren Noten holen (Fallback auf alle Levels wenn nötig)
    let notes = getNotesForPosition(rounded, userProgress.level);
    let isFallback = false;
    if (notes.length === 0) {
        notes = getNotesForPosition(rounded, 3);
        isFallback = true;
    }

    if (notes.length > 0 && Math.abs(pos - rounded) < 0.3) {
        // Render Buttons for each note
        notes.forEach((n, index) => {
            const btn = document.createElement('div');
            btn.className = `note-chip ${isFallback ? 'fallback-note' : ''} ${index === 0 ? 'active-note' : ''}`; // Default active first
            btn.innerHTML = `${n.text} <i class="bi bi-volume-up-fill small"></i>`;
            btn.onclick = () => playSingleNote(n);
            container.appendChild(btn);
        });

        // Default render first note in stave
        const keys = notes.map(n => n.key);
        if (lastLearnRenderedNote !== keys.join(',')) {
            renderVexFlowNotes("learnStaff", keys, isFallback);
            lastLearnRenderedNote = keys.join(',');
        }

    } else if (Math.abs(pos - rounded) < 0.3) {
        // Empty Stave but visible
        container.innerHTML = `<span class="text-muted small">Keine Töne auf dieser Position im aktuellen Level.</span>`;
        renderEmptyStave("learnStaff");
    }
    highlightMarker('learn', rounded);
}

function renderEmptyStave(id) {
    const div = document.getElementById(id); if (!div) return; div.innerHTML = "";
    const r = new Renderer(div, Renderer.Backends.SVG); r.resize(350, 150);
    const ctx = r.getContext(); ctx.scale(1.5, 1.5);
    const s = new Stave(10, 10, 210); s.addClef("bass"); s.setContext(ctx).draw();
    div.querySelector('svg').setAttribute('viewBox', '0 0 350 150');
    div.querySelector('svg').style.width = "100%"; div.querySelector('svg').style.height = "100%";
}

function handleLearnRelease(val) {
    const slider = document.getElementById('learnSlideRange');
    const currentVal = val || parseFloat(slider.value);
    const rounded = Math.round(currentVal);
    slider.value = rounded;
    handleLearnInput(rounded);
    if (document.getElementById('autoPlayCheck').checked) playCurrentLearnTone();
}

function updateVisuals(prefix, pos) {
    const maxMove = 240; const movePerPos = maxMove / 6; const px = (pos - 1) * movePerPos;
    document.getElementById(prefix + 'VisualSlide').style.transform = `translateX(${px}px)`;
    const rounded = Math.round(pos);
    document.querySelectorAll(`#pills-${prefix} .pos-btn`).forEach(b => {
        b.classList.remove('active-pos');
        if (parseInt(b.innerText) === rounded && Math.abs(pos - rounded) < 0.3) b.classList.add('active-pos');
    });
}

function highlightMarker(prefix, pos) {
    for (let i = 1; i <= 7; i++) {
        const m = document.getElementById(`${prefix}-marker-${i}`);
        if (m) m.classList.remove('active-marker');
    }
    const active = document.getElementById(`${prefix}-marker-${pos}`);
    if (active) active.classList.add('active-marker');
}

function setLearnPosition(pos) {
    document.getElementById('learnSlideRange').value = pos;
    handleLearnInput(pos);
    if (document.getElementById('autoPlayCheck').checked) playCurrentLearnTone();
}

function playCurrentLearnTone() {
    const rounded = Math.round(parseFloat(document.getElementById('learnSlideRange').value));
    let notes = getNotesForPosition(rounded, userProgress.level);
    if (notes.length === 0) notes = getNotesForPosition(rounded, 3);

    // PLAY ONLY PRIMARY NOTE (First in list or best match)
    if (notes.length > 0) {
        // Prioritize Beginner Note if exists
        const primary = notes.find(n => n.isBeginner) || notes[0];
        playSingleNote(primary);
    }
}

function initQuiz() {
    // Reset Score for current session (optional, or keep global XP)
    // We focus on XP now.
    nextQuestion();
}

function nextQuestion() {
    quizActive = true;
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('checkAnswerBtn').style.display = 'block';
    document.getElementById('quizFeedback').style.display = 'none';
    document.getElementById('quizStaff').classList.remove('correct', 'wrong');

    // Use User Level
    const questions = generateQuestionsForLevel(userProgress.level);

    if (questions.length === 0) { alert("Keine Fragen verfügbar!"); return; }
    currentQuizQuestion = questions[Math.floor(Math.random() * questions.length)];
    renderVexFlowNotes("quizStaff", [currentQuizQuestion.key]);

    // Reset Position to 1 for new question
    handleQuizInput(1);
    document.getElementById('quizSlideRange').value = 1;

    // Update Level Hint Text
    let txt = `Level ${userProgress.level}: `;
    if (userProgress.level === 1) txt += "Anfänger (Pos 1-2)";
    else if (userProgress.level === 2) txt += "Fortgeschritten (Pos 1-4)";
    else txt += "Meister (Alle Positionen)";
    const hintEl = document.getElementById('quizLevelHint');
    if (hintEl) hintEl.innerText = txt;
}

function checkQuizAnswer() {
    if (!quizActive) return;
    const userPos = Math.round(currentSliderSelection);
    const fb = document.getElementById('quizFeedback');
    const staff = document.getElementById('quizStaff');

    if (userPos === currentQuizQuestion.correct) {
        // Correct
        addXP(10 + (userProgress.streak > 0 ? 5 : 0)); // Bonus for daily streak? Or session streak?
        // Let's use session streak for XP bonus
        streak++; // Session streak

        fb.className = "feedback-badge bg-success text-white";
        fb.innerHTML = `<strong>Richtig!</strong> <i class="bi bi-music-note-beamed"></i> (+10 XP)`;
        staff.classList.add('correct');
        playBrassTone(currentQuizQuestion.freq);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else {
        streak = 0;
        fb.className = "feedback-badge bg-danger text-white";
        fb.innerHTML = `<strong>Falsch.</strong> Die richtige Position ist <strong>${currentQuizQuestion.correct}</strong>`;
        staff.classList.add('wrong');
        playBrassTone(80); // Error sound

        // VISUAL FEEDBACK: Move slide to correct position automatically
        setTimeout(() => {
            snapQuizInput(currentQuizQuestion.correct);
            playBrassTone(currentQuizQuestion.freq); // Play correct tone after moving
        }, 800);
    }

    // Update UI
    updateUIStats();

    fb.style.display = 'block';
    document.getElementById('checkAnswerBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'block';
    quizActive = false;
}

function switchMainView(v) {
    const t = document.getElementById('view-trainer'); const i = document.getElementById('view-instructions');
    if (v === 'trainer') { t.classList.remove('d-none'); i.classList.add('d-none'); if (currentQuizQuestion) renderVexFlowNotes("quizStaff", [currentQuizQuestion.key]); }
    else { t.classList.add('d-none'); i.classList.remove('d-none'); }
    const nb = document.getElementById('navbarNav'); if (nb.classList.contains('show')) new bootstrap.Collapse(nb).hide();
}

// --- MICROPHONE & TUNER LOGIC ---
let micActive = false;
let micStream = null;
let analyser = null;
let micBuffer = null;
let pitchLoopId = null;
let lastDetectedNote = null;
let noteHoldTime = 0;
const NOTE_HOLD_THRESHOLD = 15; // Frames to hold note (~250ms)

function toggleMicMode() {
    const chk = document.getElementById('micModeSwitch');
    micActive = chk.checked;

    const sliderUI = document.getElementById('slider-interface');
    const tunerUI = document.getElementById('tuner-interface');
    const hintBtn = document.getElementById('hintBtnContainer');
    const mobileControls = document.querySelector('.mobile-controls-container');

    if (micActive) {
        sliderUI.classList.add('d-none');
        tunerUI.classList.remove('d-none');
        if (hintBtn) hintBtn.classList.add('d-none');
        if (mobileControls) mobileControls.classList.add('d-none');
        startMicrophone();
    } else {
        sliderUI.classList.remove('d-none');
        tunerUI.classList.add('d-none');
        if (hintBtn) hintBtn.classList.remove('d-none');
        if (mobileControls) mobileControls.classList.remove('d-none');
        stopMicrophone();
    }
}

async function startMicrophone() {
    try {
        const ctx = initAudio();
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = ctx.createMediaStreamSource(micStream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        micBuffer = new Float32Array(analyser.fftSize);
        updatePitch();
    } catch (e) {
        console.error("Mic Error:", e);
        alert("Mikrofon-Zugriff verweigert oder nicht möglich.");
        document.getElementById('micModeSwitch').checked = false;
        toggleMicMode();
    }
}

function stopMicrophone() {
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    if (pitchLoopId) cancelAnimationFrame(pitchLoopId);
    document.getElementById('detectedNote').innerText = "--";
    document.getElementById('detectedFreq').innerText = "0 Hz";
    updateTunerNeedle(0); // Reset needle
}

function updatePitch() {
    if (!micActive) return;
    analyser.getFloatTimeDomainData(micBuffer);
    const ac = autoCorrelate(micBuffer, audioCtx.sampleRate);

    if (ac !== -1) {
        const note = noteFromPitch(ac);
        const noteName = noteStrings[note % 12];
        const octave = Math.floor(note / 12) - 1;
        const detune = centsOffFromPitch(ac, note);

        document.getElementById('detectedNote').innerText = `${noteName}${octave}`;
        document.getElementById('detectedFreq').innerText = Math.round(ac) + " Hz";

        updateTunerNeedle(detune);
        checkMicAnswer(noteName, octave, detune);
    } else {
        // No signal
        updateTunerNeedle(null); // Drift back to center or hide
    }

    pitchLoopId = requestAnimationFrame(updatePitch);
}

function updateTunerNeedle(cents) {
    const needle = document.getElementById('tunerNeedle');
    if (cents === null) {
        needle.style.opacity = 0.3;
        return;
    }
    needle.style.opacity = 1;
    // Map -50..+50 cents to 0..100% left
    // 0 cents = 50%
    let percent = 50 + (cents);
    // Clamp
    percent = Math.max(5, Math.min(95, percent));
    needle.style.left = percent + "%";

    if (Math.abs(cents) < 10) needle.style.background = "#198754"; // Green
    else needle.style.background = "#dc3545"; // Red
}

function checkMicAnswer(noteName, octave, cents) {
    if (!quizActive || !currentQuizQuestion) return;

    // Map German Note Names from Quiz to English/Standard for comparison if needed
    // Quiz uses: C, Des, D, Es, E, F, Ges, G, As, A, B, H
    // Tuner uses: C, C#, D, D#, E, F, F#, G, G#, A, A#, B

    // Simple mapping for comparison
    const target = currentQuizQuestion.noteName; // e.g. "F", "Fis", "Ges"
    const detected = noteName; // "F", "F#", "G"

    // Normalize Target
    let normTarget = target.replace("is", "#").replace("es", "b").replace("s", "b"); // Basic cleanup
    if (normTarget === "H") normTarget = "B"; // German H -> English B
    if (normTarget === "B") normTarget = "Bb"; // German B -> English Bb
    if (normTarget === "As") normTarget = "Ab";
    if (normTarget === "Des") normTarget = "Db";
    if (normTarget === "Ges") normTarget = "Gb";

    // Normalize Detected (Sharp to Flat conversion if target is flat)
    let normDetected = detected;
    if (normTarget.includes("b") && normDetected.includes("#")) {
        // Convert F# to Gb, etc.
        const map = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
        if (map[normDetected]) normDetected = map[normDetected];
    }

    // Check match
    // Ignore octave for now? Or strict? Let's try strict first but maybe loose on octave if beginner.
    // Actually, let's just check Note Name first.

    if (normDetected === normTarget && Math.abs(cents) < 25) {
        noteHoldTime++;
        if (noteHoldTime > NOTE_HOLD_THRESHOLD) {
            // SUCCESS via MIC
            // Simulate correct answer
            // We need to find the position for this note to "snap" the UI
            const correctPos = currentQuizQuestion.correct;
            currentSliderSelection = correctPos;
            checkQuizAnswer();
            noteHoldTime = 0;
        }
    } else {
        noteHoldTime = Math.max(0, noteHoldTime - 1);
    }
}

// --- AUDIO MATH ---
const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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

function autoCorrelate(buf, sampleRate) {
    // Implements the ACF2+ algorithm
    let SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        const val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // Not enough signal

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++)
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++)
        if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j + i];

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}

function toggleDarkMode() {
    const html = document.documentElement;
    const btn = document.getElementById('darkModeToggleBtn');
    const icon = btn.querySelector('i');

    if (html.getAttribute('data-bs-theme') === 'dark') {
        html.setAttribute('data-bs-theme', 'light');
        icon.className = 'bi bi-sun-fill';
        btn.classList.replace('btn-outline-secondary', 'btn-outline-warning');
    } else {
        html.setAttribute('data-bs-theme', 'dark');
        icon.className = 'bi bi-moon-stars-fill';
        btn.classList.replace('btn-outline-warning', 'btn-outline-secondary');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initGamification();
    initQuiz();
    setLearnPosition(1);

    // Init Dark Mode State
    // Default is dark in HTML, so set button accordingly
    const btn = document.getElementById('darkModeToggleBtn');
    if (btn) {
        // Check current state
        if (document.documentElement.getAttribute('data-bs-theme') === 'dark') {
            btn.querySelector('i').className = 'bi bi-moon-stars-fill';
        } else {
            btn.querySelector('i').className = 'bi bi-sun-fill';
            btn.classList.replace('btn-outline-secondary', 'btn-outline-warning');
        }
    }

    document.getElementById('score').innerText = 0; document.getElementById('streakCount').innerText = 0; document.getElementById('highScore').innerText = highScore;
    if (typeof generateReferenceTable === 'function') generateReferenceTable();
});
