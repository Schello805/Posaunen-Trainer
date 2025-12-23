
import { userProgress, appState } from './state.js';
import { positionMap } from './data.js';
import { playBrassTone, playSingleNote } from './audio.js';
import { renderVexFlowNotes, renderEmptyStave } from './score-renderer.js';
import { saveProgress, addXP } from './gamification.js';
import { updateUIStats } from './ui.js';

console.log("Trainer Module v13 Loaded");

// --- HELPER LOGIC ---

function getAllowedPositions(lvl) {
    if (lvl === 1) return [1, 2, 3, 4, 6];
    if (lvl === 2) return [1, 2, 3, 4, 5, 6, 7];
    return [1, 2, 3, 4, 5, 6, 7];
}

function getNotesForPosition(p, lvl) {
    if (!positionMap[p]) return [];
    if (lvl === 1) return positionMap[p].filter(n => n.isBeginner);
    if (lvl === 2) return positionMap[p].filter(n => n.level <= 2);
    return positionMap[p];
}

function getEffectiveLevel() {
    return appState.difficultyOverride === 0 ? userProgress.level : appState.difficultyOverride;
}

function generateQuestionsForLevel(lvl) {
    const effectiveLevel = getEffectiveLevel();
    let q = [];
    const allowedPos = getAllowedPositions(effectiveLevel);

    allowedPos.forEach(pos => {
        const notes = getNotesForPosition(pos, effectiveLevel);
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

// --- QUIZ & TRAINER LOGIC ---

export function initQuiz() {
    nextQuestion();
}

export function nextQuestion() {
    appState.quizActive = true;
    const nextBtn = document.getElementById('nextBtn');
    const checkBtn = document.getElementById('checkAnswerBtn');
    const fb = document.getElementById('quizFeedback');
    const staff = document.getElementById('quizStaff');

    if (nextBtn) nextBtn.style.display = 'none';
    if (checkBtn) checkBtn.style.display = 'block';
    if (fb) fb.style.display = 'none';
    if (staff) staff.classList.remove('correct', 'wrong');

    const questions = generateQuestionsForLevel(userProgress.level);

    if (questions.length === 0) { alert("Keine Fragen verfügbar!"); return; }
    appState.currentQuizQuestion = questions[Math.floor(Math.random() * questions.length)];
    renderVexFlowNotes("quizStaff", [appState.currentQuizQuestion.key]);

    handleQuizInput(1);
    const slider = document.getElementById('quizSlideRange');
    if (slider) slider.value = 1;

    let txt = `Level ${userProgress.level}: `;
    if (userProgress.level === 1) txt += "Anfänger (Pos 1-2)";
    else if (userProgress.level === 2) txt += "Fortgeschritten (Pos 1-4)";
    else txt += "Meister (Alle Positionen)";
    const hintEl = document.getElementById('quizLevelHint');
    if (hintEl) hintEl.innerText = txt;
}

export function checkQuizAnswer() {
    if (!appState.quizActive) return;
    const userPos = Math.round(appState.currentSliderSelection);
    const fb = document.getElementById('quizFeedback');
    const staff = document.getElementById('quizStaff');

    // Update statistics
    userProgress.todayTotal++;
    userProgress.totalQuestions++;
    userProgress.positionStats[appState.currentQuizQuestion.correct].total++;

    if (userPos === appState.currentQuizQuestion.correct) {
        // Correct
        userProgress.todayCorrect++;
        userProgress.totalCorrect++;
        userProgress.positionStats[appState.currentQuizQuestion.correct].correct++;

        if (userProgress.level === 1) {
            userProgress.levelRequirements.quizCorrect++;
        }

        addXP(10 + (appState.streak > 0 ? 5 : 0));
        appState.streak++;

        fb.className = "feedback-badge bg-success text-white";
        fb.innerHTML = `<strong>Richtig!</strong> <i class="bi bi-music-note-beamed"></i> (+10 XP) | Heute: ${userProgress.todayCorrect}/${userProgress.todayTotal}`;
        staff.classList.add('correct');
        playBrassTone(appState.currentQuizQuestion.freq);
        if (window.confetti) window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    } else {
        // Wrong
        appState.streak = 0;
        fb.className = "feedback-badge bg-danger text-white";
        fb.innerHTML = `<strong>Falsch.</strong> Die richtige Position ist <strong>${appState.currentQuizQuestion.correct}</strong>`;
        staff.classList.add('wrong');
        playBrassTone(80); // Fail sound

        setTimeout(() => {
            snapQuizInput(appState.currentQuizQuestion.correct);
            playBrassTone(appState.currentQuizQuestion.freq);
        }, 800);
    }

    updateUIStats();
    saveProgress();

    fb.style.display = 'block';

    document.getElementById('checkAnswerBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'block';
    appState.quizActive = false;
}

export function handleQuizInput(val) {
    const pos = parseFloat(val);
    appState.currentSliderSelection = pos;
    updateVisuals('quiz', pos);
    const rounded = Math.round(pos);

    const selEl = document.getElementById('quizCurrentSelection');
    if (selEl) selEl.innerText = "Position " + rounded;

    const notes = getNotesForPosition(rounded, userProgress.level);
    const noteText = notes.length > 0 ? notes.map(n => n.text).join(', ') : "-";
    const notesDiv = document.getElementById('quizNotesOnPosition');
    if (notesDiv) notesDiv.innerText = `(Töne hier: ${noteText})`;

    highlightMarker('quiz', rounded);
}

export function snapQuizInput(val) {
    const rounded = Math.round(val);
    const slider = document.getElementById('quizSlideRange');
    if (slider) slider.value = rounded;
    handleQuizInput(rounded);
}

export function playQuizHint() {
    if (appState.currentQuizQuestion) {
        playBrassTone(appState.currentQuizQuestion.freq);
    }
}

export function setDifficultyOverride(level) {
    appState.difficultyOverride = level;
    document.getElementById('autoLevelDisplay').textContent = userProgress.level;
    nextQuestion();
}

// --- LEARN MODE LOGIC ---

export function handleLearnInput(val) {
    const pos = parseFloat(val);
    updateVisuals('learn', pos);
    const rounded = Math.round(pos);

    const container = document.getElementById('learnNoteInteraction');
    container.innerHTML = '';

    let notes = getNotesForPosition(rounded, userProgress.level);
    let isFallback = false;
    if (notes.length === 0) {
        notes = getNotesForPosition(rounded, 3);
        isFallback = true;
    }

    if (notes.length > 0 && Math.abs(pos - rounded) < 0.3) {
        // Default to first note if none selected, or keep current if valid? 
        // Simpler: Always default to first note on slide change for consistency.
        const defaultNote = notes[0];

        notes.forEach((n, index) => {
            const btn = document.createElement('div');
            btn.className = `note-chip ${isFallback ? 'fallback-note' : ''} ${index === 0 ? 'active-note' : ''}`;
            btn.innerHTML = `${n.text} <i class="bi bi-volume-up-fill small"></i>`;
            btn.onclick = () => {
                document.querySelectorAll('.note-chip').forEach(b => b.classList.remove('active-note'));
                btn.classList.add('active-note');
                playSingleNote(n);
                // Update Staff to match clicked note
                renderVexFlowNotes("learnStaff", [n.key], isFallback);
                appState.lastLearnRenderedNote = n.key;
            };
            container.appendChild(btn);
        });

        // Render ONLY the default (first) note initially
        if (appState.lastLearnRenderedNote !== defaultNote.key) {
            renderVexFlowNotes("learnStaff", [defaultNote.key], isFallback);
            appState.lastLearnRenderedNote = defaultNote.key;
        }

    } else if (Math.abs(pos - rounded) < 0.3) {
        container.innerHTML = `<span class="text-muted small">Keine Töne auf dieser Position im aktuellen Level.</span>`;
        renderEmptyStave("learnStaff");
    }
    highlightMarker('learn', rounded);
}

export function handleLearnRelease(val) {
    const slider = document.getElementById('learnSlideRange');
    const currentVal = val || parseFloat(slider.value);
    const rounded = Math.round(currentVal);
    slider.value = rounded;
    handleLearnInput(rounded);
    if (document.getElementById('autoPlayCheck').checked) playCurrentLearnTone();
}

export function setLearnPosition(pos) {
    document.getElementById('learnSlideRange').value = pos;
    handleLearnInput(pos);
    if (document.getElementById('autoPlayCheck').checked) playCurrentLearnTone();
}

export function playCurrentLearnTone() {
    const rounded = Math.round(parseFloat(document.getElementById('learnSlideRange').value));
    let notes = getNotesForPosition(rounded, userProgress.level);
    if (notes.length === 0) notes = getNotesForPosition(rounded, 3);

    if (notes.length > 0) {
        const primary = notes.find(n => n.isBeginner) || notes[0];
        playSingleNote(primary);
    }
}

// --- VISUAL UTILS ---

function updateVisuals(prefix, pos) {
    const maxMove = 240;
    const movePerPos = maxMove / 6;
    const px = (pos - 1) * movePerPos;

    const slide = document.getElementById(prefix + 'VisualSlide');
    if (slide) slide.style.transform = `translateX(${px}px)`;

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

// --- MIC ANSWER LOGIC ---
const NOTE_HOLD_THRESHOLD = 15;
let noteHoldTime = 0;

export function checkMicAnswerLogic(noteName, octave, cents) {
    if (!appState.quizActive || !appState.currentQuizQuestion) return;

    // Simple mapping for comparison
    const target = appState.currentQuizQuestion.noteName;
    const detected = noteName;

    // Normalize Target
    let normTarget = target.replace("is", "#").replace("es", "b").replace("s", "b");
    if (normTarget === "H") normTarget = "B";
    if (normTarget === "B") normTarget = "Bb";
    if (normTarget === "As") normTarget = "Ab";
    if (normTarget === "Des") normTarget = "Db";
    if (normTarget === "Ges") normTarget = "Gb";

    // Normalize Detected (Sharp to Flat conversion if target is flat)
    let normDetected = detected;
    if (normTarget.includes("b") && normDetected.includes("#")) {
        const map = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
        if (map[normDetected]) normDetected = map[normDetected];
    }

    // Strict check on Note Name; ignore octave for now to be forgiving? 
    // Or we could try to guess octave.
    if (normDetected === normTarget && Math.abs(cents) < 25) {
        noteHoldTime++;
        if (noteHoldTime > NOTE_HOLD_THRESHOLD) {
            // SUCCESS via MIC
            const correctPos = appState.currentQuizQuestion.correct;
            appState.currentSliderSelection = correctPos;
            checkQuizAnswer(); // Trigger normal success flow
            noteHoldTime = 0;
        }
    } else {
        noteHoldTime = Math.max(0, noteHoldTime - 1);
    }
}
