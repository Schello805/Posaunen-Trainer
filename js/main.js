
import { initGamification } from './gamification.js';
import { initTheoryQuiz, resetTheoryQuiz } from './theory.js';
import {
    initQuiz,
    handleLearnInput,
    handleLearnRelease,
    handleQuizInput,
    snapQuizInput,
    checkQuizAnswer,
    nextQuestion,
    playQuizHint,
    setLearnPosition,
    playCurrentLearnTone,
    setDifficultyOverride,
    checkMicAnswerLogic,
    toggleValve
} from './app-core.js';
import { startMicrophone, stopMicrophone } from './audio.js';
import { generateReferenceTable, generateStats, updateInstructionsUI } from './ui.js';
import { renderVexFlowNotes } from './score-renderer.js';
import { appState } from './state.js';

// --- EXPOSE GLOBAL FUNCTIONS (Early Binding) ---
console.log("Main.js: Binding global functions...");

// Bind immediately to ensure availability
window.switchMainView = switchMainView;
window.resetToStartScreen = resetToStartScreen;
window.selectInstrument = selectInstrument;
window.toggleDarkMode = toggleDarkMode;
window.toggleMicMode = toggleMicMode;

window.handleQuizInput = handleQuizInput;
window.snapQuizInput = snapQuizInput;
window.checkQuizAnswer = checkQuizAnswer;
window.nextQuestion = nextQuestion;
window.playQuizHint = playQuizHint;
window.setDifficultyOverride = setDifficultyOverride;

window.handleLearnInput = handleLearnInput;
window.handleLearnRelease = handleLearnRelease;
window.setLearnPosition = setLearnPosition;
window.toggleValve = toggleValve;

window.resetTheoryQuiz = resetTheoryQuiz;

if (typeof window.toggleValve === 'function') {
    console.log("toggleValve is successfully bound to window.");
} else {
    console.error("CRITICAL: toggleValve failed to bind!");
}

// --- MAIN UI FUNCTIONS ---

function selectInstrument(inst) {
    console.log(`selectInstrument called with: ${inst}`);
    appState.selectedInstrument = inst;
    
    // Switch View
    document.getElementById('view-start').classList.add('d-none');
    document.getElementById('view-trainer').classList.remove('d-none');
    
    // Toggle Instrument Interface (Quiz)
    const trmb = document.getElementById('trombone-interface');
    const trmp = document.getElementById('trumpet-interface');
    
    // Toggle Instrument Interface (Learn)
    const learnTrmb = document.getElementById('learn-trombone-interface');
    const learnTrmp = document.getElementById('learn-trumpet-interface');
    
    if (inst === 'trumpet') {
        if (trmb) trmb.classList.add('d-none');
        if (trmp) trmp.classList.remove('d-none');
        
        if (learnTrmb) learnTrmb.classList.add('d-none');
        if (learnTrmp) learnTrmp.classList.remove('d-none');
    } else {
        if (trmb) trmb.classList.remove('d-none');
        if (trmp) trmp.classList.add('d-none');
        
        if (learnTrmb) learnTrmb.classList.remove('d-none');
        if (learnTrmp) learnTrmp.classList.add('d-none');
    }

    // Re-Init with new instrument context
    initQuiz();
    initTheoryQuiz(); // Reload theory questions for new instrument
    setLearnPosition(1);
    generateReferenceTable(); // Update reference table for instrument
}

function resetToStartScreen() {
    document.getElementById('view-trainer').classList.add('d-none');
    document.getElementById('view-instructions').classList.add('d-none');
    document.getElementById('view-start').classList.remove('d-none');
    appState.selectedInstrument = null;
}

function switchMainView(v) {
    const t = document.getElementById('view-trainer');
    const i = document.getElementById('view-instructions');
    const s = document.getElementById('view-start');

    if (v === 'trainer') {
        // Security check: If no instrument selected, redirect to start
        if (!appState.selectedInstrument) {
            console.log("Switch to trainer requested but no instrument selected. Redirecting to start.");
            resetToStartScreen();
            return;
        }

        s.classList.add('d-none');
        i.classList.add('d-none');
        t.classList.remove('d-none');

        if (appState.currentQuizQuestion) {
            // Re-render notes with correct clef if coming back
            const inst = appState.selectedInstrument === 'trumpet' ? 'treble' : 'bass'; 
            // Trigger a re-render if needed via handleQuizInput logic which refreshes visuals
            // accessing the slider value to trigger update
            const slider = document.getElementById('quizSlideRange');
            if (slider) handleQuizInput(slider.value);
        }
    } else {
        // Instructions view
        s.classList.add('d-none');
        t.classList.add('d-none');
        i.classList.remove('d-none');
        generateReferenceTable();
        generateStats();
        updateInstructionsUI();
    }

    // Close mobile nav if open
    // const nb = document.getElementById('navbarNav'); ... (Not really used in current HTML but good practice)
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

function toggleMicMode() {
    const chk = document.getElementById('micModeSwitch');
    appState.micActive = chk.checked;

    // We need to toggle whatever instrument interface is active vs tuner
    const trmb = document.getElementById('trombone-interface');
    const trmp = document.getElementById('trumpet-interface');
    const tunerUI = document.getElementById('tuner-interface');
    const hintBtn = document.querySelector('.mb-2 button'); // Hint button wrapper

    if (appState.micActive) {
        // Hide both inputs
        if (trmb) trmb.classList.add('d-none');
        if (trmp) trmp.classList.add('d-none');
        
        tunerUI.classList.remove('d-none');
        if (hintBtn) hintBtn.parentElement.classList.add('d-none');
        // Start Mic with Callback
        startMicrophone(handlePitchUpdate);
    } else {
        // Show correct input based on selected instrument
        if (appState.selectedInstrument === 'trumpet') {
             if (trmp) trmp.classList.remove('d-none');
        } else {
             if (trmb) trmb.classList.remove('d-none');
        }
        
        tunerUI.classList.add('d-none');
        if (hintBtn) hintBtn.parentElement.classList.remove('d-none');
        stopMicrophone();
    }
}

function handlePitchUpdate(data) {
    if (data.detected) {
        document.getElementById('detectedNote').innerText = `${data.noteName}${data.octave}`;
        document.getElementById('detectedFreq').innerText = data.freq + " Hz";
        updateTunerNeedle(data.cents);

        checkMicAnswerLogic(data);
    } else {
        // Fade out needle?
        updateTunerNeedle(null);
    }
}

function updateTunerNeedle(cents) {
    const needle = document.getElementById('tunerNeedle');
    if (cents === null) {
        needle.style.opacity = 0.3;
        return;
    }
    needle.style.opacity = 1;
    let percent = 50 + (cents);
    percent = Math.max(5, Math.min(95, percent));
    needle.style.left = percent + "%";

    if (Math.abs(cents) < 10) needle.style.background = "#198754";
    else needle.style.background = "#dc3545";
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("App initializing... resetting to start screen.");
    resetToStartScreen(); // Ensure consistent initial state (Start Screen visible, Trainer hidden)
    
    initGamification();
    initQuiz(); // Starts active
    setLearnPosition(1);
    initTheoryQuiz();

    // Tab Change Listener to resolve VexFlow rendering issues on hidden tabs
    const learnTabBtn = document.querySelector('button[data-bs-target="#pills-learn"]');
    if (learnTabBtn) {
        learnTabBtn.addEventListener('shown.bs.tab', () => {
            console.log("Learn Tab Shown - Forcing Re-render");
            // Force re-render logic in trainer.js
            appState.lastLearnRenderedNote = null;
            const slider = document.getElementById('learnSlideRange');
            if (slider) {
                // Determine if we need to render empty or note based on slider
                handleLearnInput(slider.value);
            }
        });
    }
    // Default to Quiz view

    // Dark Mode Check
    const btn = document.getElementById('darkModeToggleBtn');
    if (btn) {
        if (document.documentElement.getAttribute('data-bs-theme') === 'dark') {
            btn.querySelector('i').className = 'bi bi-moon-stars-fill';
        } else {
            btn.querySelector('i').className = 'bi bi-sun-fill';
            btn.classList.replace('btn-outline-secondary', 'btn-outline-warning');
        }
    }

    generateReferenceTable();
});

// --- EXPOSE GLOBAL FUNCTIONS FOR HTML HANDLERS ---
console.log("Main.js: Exposing functions to window");
console.log("toggleValve type:", typeof toggleValve);

window.switchMainView = switchMainView;
window.resetToStartScreen = resetToStartScreen;
window.selectInstrument = selectInstrument;
window.toggleDarkMode = toggleDarkMode;
window.toggleMicMode = toggleMicMode;

window.handleQuizInput = handleQuizInput;
window.snapQuizInput = snapQuizInput;
window.checkQuizAnswer = checkQuizAnswer;
window.nextQuestion = nextQuestion;
window.playQuizHint = playQuizHint;
window.setDifficultyOverride = setDifficultyOverride;

window.handleLearnInput = handleLearnInput;
window.handleLearnRelease = handleLearnRelease;
window.setLearnPosition = setLearnPosition;
window.toggleValve = toggleValve;

window.resetTheoryQuiz = resetTheoryQuiz;

// Keyboard Controls
document.addEventListener('keydown', (e) => {
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
