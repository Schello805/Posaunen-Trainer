
import { userProgress, appState, getCurrentUserProgress } from './state.js';
import { positionMap, getInstrumentData } from './data.js';
import { playBrassTone, playSingleNote } from './audio.js';
import { renderVexFlowNotes, renderEmptyStave } from './score-renderer.js';
import { saveProgress, addXP } from './gamification.js';
import { updateUIStats } from './ui.js';

console.log("Trainer Module v15 Loaded");

// --- HELPER LOGIC ---

function getInstrument() {
    return getInstrumentData(appState.selectedInstrument || 'trombone');
}

function getAllowedPositions(lvl) {
    if (lvl === 1) return [1, 2, 3, 4, 6];
    if (lvl === 2) return [1, 2, 3, 4, 5, 6, 7];
    return [1, 2, 3, 4, 5, 6, 7];
}

function getNotesForPosition(p, lvl) {
    const inst = getInstrument();
    const map = inst.positions;
    if (!map[p]) return [];
    if (lvl === 1) return map[p].filter(n => n.isBeginner);
    if (lvl === 2) return map[p].filter(n => n.level <= 2);
    return map[p];
}

function getEffectiveLevel() {
    const stats = getCurrentUserProgress();
    return appState.difficultyOverride === 0 ? stats.level : appState.difficultyOverride;
}

function generateQuestionsForLevel(lvl) {
    const effectiveLevel = getEffectiveLevel();
    let possibleQuestions = [];
    const allowedPos = getAllowedPositions(effectiveLevel);
    const stats = getCurrentUserProgress();

    allowedPos.forEach(pos => {
        const notes = getNotesForPosition(pos, effectiveLevel);
        notes.forEach(n => {
            // Ensure stats exist
            if (!stats.noteStats) stats.noteStats = {};
            if (!stats.noteStats[n.key]) {
                stats.noteStats[n.key] = { weight: 10, correct: 0, wrong: 0 };
            }

            possibleQuestions.push({
                noteName: n.text,
                correct: pos,
                key: n.key,
                freq: n.freq,
                weight: stats.noteStats[n.key].weight
            });
        });
    });

    // Weighted Selection (Spaced Repetition)
    // 1. Calculate total weight
    const totalWeight = possibleQuestions.reduce((sum, q) => sum + q.weight, 0);
    
    // 2. Random value between 0 and totalWeight
    let randomVal = Math.random() * totalWeight;
    
    // 3. Find the question
    for (const q of possibleQuestions) {
        randomVal -= q.weight;
        if (randomVal <= 0) {
            return [q]; // Return as array to match previous structure logic
        }
    }
    
    // Fallback
    return possibleQuestions;
}

// --- QUIZ & TRAINER LOGIC ---

export function initQuiz() {
    updateButtonLabels();
    nextQuestion();
}

function updateButtonLabels() {
    const inst = getInstrument();
    const labels = inst.labels; 

    // Update Quiz Buttons
    const quizBtns = document.querySelectorAll('#pills-quiz .pos-btn');
    quizBtns.forEach((btn, index) => {
        if (labels[index]) btn.innerText = labels[index];
    });

    // Update Learn Buttons
    const learnBtns = document.querySelectorAll('#pills-learn .pos-btn');
    learnBtns.forEach((btn, index) => {
        if (labels[index]) btn.innerText = labels[index];
    });
}

export function nextQuestion() {
    appState.quizActive = true;
    const nextBtn = document.getElementById('nextBtn');
    const checkBtn = document.getElementById('checkAnswerBtn');
    const fb = document.getElementById('quizFeedback');
    const staff = document.getElementById('quizStaff');
    const inst = getInstrument();
    const stats = getCurrentUserProgress();

    if (nextBtn) nextBtn.style.display = 'none';
    if (checkBtn) checkBtn.style.display = 'block';
    if (fb) fb.style.display = 'none';
    if (staff) staff.classList.remove('correct', 'wrong');

    const questions = generateQuestionsForLevel(stats.level);

    if (questions.length === 0) { alert("Keine Fragen verfügbar!"); return; }
    appState.currentQuizQuestion = questions[Math.floor(Math.random() * questions.length)];
    renderVexFlowNotes("quizStaff", [appState.currentQuizQuestion.key], false, inst.clef);

    handleQuizInput(1);
    const slider = document.getElementById('quizSlideRange');
    if (slider) slider.value = 1;

    let txt = `Level ${stats.level}: `;
    if (stats.level === 1) txt += "Anfänger";
    else if (stats.level === 2) txt += "Fortgeschritten";
    else txt += "Meister";
    const hintEl = document.getElementById('quizLevelHint');
    if (hintEl) hintEl.innerText = txt;
}

export function checkQuizAnswer() {
    if (!appState.quizActive) return;
    const userPos = Math.round(appState.currentSliderSelection);
    const fb = document.getElementById('quizFeedback');
    const staff = document.getElementById('quizStaff');
    const stats = getCurrentUserProgress();

    // Update statistics
    stats.todayTotal++;
    stats.totalQuestions++;
    if (!stats.positionStats[appState.currentQuizQuestion.correct]) {
         stats.positionStats[appState.currentQuizQuestion.correct] = { correct: 0, total: 0 };
    }
    stats.positionStats[appState.currentQuizQuestion.correct].total++;

    // Spaced Repetition Stats Init
    const currentKey = appState.currentQuizQuestion.key;
    if (!stats.noteStats) stats.noteStats = {};
    if (!stats.noteStats[currentKey]) stats.noteStats[currentKey] = { weight: 10, correct: 0, wrong: 0 };

    if (userPos === appState.currentQuizQuestion.correct) {
        // Correct
        stats.todayCorrect++;
        stats.totalCorrect++;
        stats.positionStats[appState.currentQuizQuestion.correct].correct++;

        // Spaced Repetition: Decrease weight (easier)
        stats.noteStats[currentKey].weight = Math.max(1, stats.noteStats[currentKey].weight - 2);
        stats.noteStats[currentKey].correct++;

        if (stats.level === 1) {
            stats.levelRequirements.quizCorrect++;
        }

        addXP(10 + (userProgress.streak > 0 ? 5 : 0));
        // Streak is global
        // We increment global streak in gamification logic daily check, but here?
        // Actually, daily streak is typically "days in a row", not "correct answers in a row".
        // BUT appState.streak seems to be "session streak" for XP bonus.
        appState.streak++;

        fb.className = "feedback-badge bg-success text-white";
        fb.innerHTML = `<strong>Richtig!</strong> <i class="bi bi-music-note-beamed"></i> (+10 XP) | Heute: ${stats.todayCorrect}/${stats.todayTotal}`;
        staff.classList.add('correct');
        playBrassTone(appState.currentQuizQuestion.freq);
        if (window.confetti) window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    } else {
        // Wrong
        // Spaced Repetition: Increase weight (harder/needs practice)
        stats.noteStats[currentKey].weight += 5;
        stats.noteStats[currentKey].wrong++;

        appState.streak = 0;
        fb.className = "feedback-badge bg-danger text-white";
        
        const inst = getInstrument();
        const correctLabel = inst.labels[appState.currentQuizQuestion.correct - 1]; // Index 0-based
        
        fb.innerHTML = `<strong>Falsch.</strong> Die richtige Position ist <strong>${correctLabel}</strong>`;
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
    const inst = getInstrument();
    const stats = getCurrentUserProgress();

    const selEl = document.getElementById('quizCurrentSelection');
    if (selEl) {
        // Use instrument label if available, mapped by 1-7 index
        const label = inst.labels[rounded - 1] || rounded;
        const prefix = inst.id === 'trumpet' ? "Ventile: " : "Position ";
        selEl.innerText = prefix + label;
    }

    const notes = getNotesForPosition(rounded, stats.level);
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
    const inst = getInstrument();

    const container = document.getElementById('learnNoteInteraction');
    container.innerHTML = '';
    
    let notes = getNotesForPosition(rounded, userProgress.level);
    let isFallback = false;
    if (notes.length === 0) {
        notes = getNotesForPosition(rounded, 3);
        isFallback = true;
    }

    if (notes.length > 0 && Math.abs(pos - rounded) < 0.3) {
        // Default to first note
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
                renderVexFlowNotes("learnStaff", [n.key], isFallback, inst.clef);
                appState.lastLearnRenderedNote = n.key;
            };
            container.appendChild(btn);
        });

        // Render ONLY the default (first) note initially
        if (appState.lastLearnRenderedNote !== defaultNote.key) {
            renderVexFlowNotes("learnStaff", [defaultNote.key], isFallback, inst.clef);
            appState.lastLearnRenderedNote = defaultNote.key;
        }

    } else if (Math.abs(pos - rounded) < 0.3) {
        container.innerHTML = `<span class="text-muted small">Keine Töne auf dieser Position im aktuellen Level.</span>`;
        renderEmptyStave("learnStaff", inst.clef);
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

export function toggleValve(valveId, mode) {
    const sliderId = mode === 'quiz' ? 'quizSlideRange' : 'learnSlideRange';
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    
    let currentPos = Math.round(parseFloat(slider.value));
    
    // Current valves based on canonical map
    const valveMap = {
        1: [],
        2: [2],
        3: [1],
        4: [1, 2],
        5: [2, 3],
        6: [1, 3],
        7: [1, 2, 3]
    };
    
    let currentValves = [...(valveMap[currentPos] || [])];
    
    // Toggle
    if (currentValves.includes(valveId)) {
        currentValves = currentValves.filter(v => v !== valveId);
    } else {
        currentValves.push(valveId);
    }
    
    // Calculate new position from total semitones
    let semitones = 0;
    if (currentValves.includes(1)) semitones += 2;
    if (currentValves.includes(2)) semitones += 1;
    if (currentValves.includes(3)) semitones += 3;
    
    let newPos = semitones + 1;
    if (newPos > 7) newPos = 7; 
    
    // Apply
    if (mode === 'quiz') snapQuizInput(newPos);
    else setLearnPosition(newPos);
}

function updateVisuals(prefix, pos) {
    const inst = getInstrument();

    if (inst.id === 'trombone') {
        const maxMove = 240;
        const movePerPos = maxMove / 6;
        const px = (pos - 1) * movePerPos;

        const slide = document.getElementById(prefix + 'VisualSlide');
        if (slide) slide.style.transform = `translateX(${px}px)`;
    } else if (inst.id === 'trumpet') {
        // Map 1-7 to Valves
        const rounded = Math.round(pos);
        // 1=0, 2=2, 3=1, 4=12, 5=23, 6=13, 7=123
        const valveMap = {
            1: [],
            2: [2],
            3: [1],
            4: [1, 2],
            5: [2, 3],
            6: [1, 3],
            7: [1, 2, 3]
        };
        const active = valveMap[rounded] || [];
        
        // Handle ID prefix (quiz -> valve-X, learn -> learn-valve-X)
        const idPrefix = prefix === 'learn' ? 'learn-valve-' : 'valve-';
        
        [1, 2, 3].forEach(v => {
            const el = document.getElementById(idPrefix + v);
            if (el) {
                if (active.includes(v)) el.classList.add('pressed');
                else el.classList.remove('pressed');
            }
        });
    }

    const rounded = Math.round(pos);
    document.querySelectorAll(`#pills-${prefix} .pos-btn`).forEach((b, index) => {
        b.classList.remove('active-pos');
        // Index is 0-based, so position is index + 1
        if ((index + 1) === rounded && Math.abs(pos - rounded) < 0.3) b.classList.add('active-pos');
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
const NOTE_HOLD_THRESHOLD = 12; // Frames to hold note (approx 0.2-0.5s)
let noteHoldTime = 0;

export function checkMicAnswerLogic(pitchData) {
    if (!appState.quizActive || !appState.currentQuizQuestion || !pitchData.detected) return;

    const targetFreq = appState.currentQuizQuestion.freq;
    const detectedFreq = pitchData.freq;

    if (!targetFreq || !detectedFreq) return;

    // Calculate interval in cents: 1200 * log2(f1 / f2)
    const centsDiff = 1200 * Math.log2(detectedFreq / targetFreq);
    
    // Tolerance: +/- 50 cents (Quarter tone)
    // We also check for octave errors? 
    // For now, let's be strict on octave. If user plays C5 instead of C4, it shouldn't count?
    // Actually, beginners might overblow. But for a trainer, we want the specific note.
    
    // However, pitch detection can be jumpy.
    // Let's stick to the specific octave for now.
    
    if (Math.abs(centsDiff) < 50) {
        noteHoldTime++;
        
        // Visual Feedback (optional, could be added to UI)
        // console.log(`Holding correct note... ${noteHoldTime}/${NOTE_HOLD_THRESHOLD}`);

        if (noteHoldTime > NOTE_HOLD_THRESHOLD) {
            // SUCCESS
            const correctPos = appState.currentQuizQuestion.correct;
            appState.currentSliderSelection = correctPos;
            checkQuizAnswer(); 
            noteHoldTime = 0;
        }
    } else {
        // Reset if pitch strays too far
        noteHoldTime = Math.max(0, noteHoldTime - 1);
    }
}
