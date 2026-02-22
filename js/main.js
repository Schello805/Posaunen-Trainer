
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
import { generateReferenceTable, generateStats, updateInstructionsUI, shareProgressReport } from './ui.js';
import { renderVexFlowNotes } from './score-renderer.js';
import { appState } from './state.js';

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

    // Show Stats Button
    const btnStats = document.getElementById('btnHeaderStats');
    if (btnStats) btnStats.classList.remove('d-none');
}

function resetToStartScreen() {
    const t = document.getElementById('view-trainer');
    const i = document.getElementById('view-instructions');
    const st = document.getElementById('view-stats');
    const s = document.getElementById('view-start');

    if (t) t.classList.add('d-none');
    if (i) i.classList.add('d-none');
    if (st) st.classList.add('d-none');
    if (s) s.classList.remove('d-none');

    appState.selectedInstrument = null;

    // Hide Stats Button
    const btnStats = document.getElementById('btnHeaderStats');
    if (btnStats) btnStats.classList.add('d-none');
}

function switchMainView(v) {
    console.log(`switchMainView called with: ${v}`);
    const t = document.getElementById('view-trainer');
    const i = document.getElementById('view-instructions');
    const s = document.getElementById('view-start');
    const st = document.getElementById('view-stats');

    // Hide all first (Safe check)
    if (t) t.classList.add('d-none');
    else console.warn("view-trainer not found");

    if (i) i.classList.add('d-none');
    else console.warn("view-instructions not found");

    if (s) s.classList.add('d-none');
    else console.warn("view-start not found");

    if (st) st.classList.add('d-none');
    else console.warn("view-stats not found");

    if (v === 'trainer') {
        // Security check: If no instrument selected, redirect to start
        if (!appState.selectedInstrument) {
            console.log("Switch to trainer requested but no instrument selected. Redirecting to start.");
            resetToStartScreen();
            return;
        }
        if (t) t.classList.remove('d-none');

        if (appState.currentQuizQuestion) {
            // Re-render notes with correct clef if coming back
            const inst = appState.selectedInstrument === 'trumpet' ? 'treble' : 'bass';
            const slider = document.getElementById('quizSlideRange');
            if (slider) handleQuizInput(slider.value);
        }
    } else if (v === 'stats') {
        if (st) st.classList.remove('d-none');
        try {
            generateStats();
        } catch (e) {
            console.error("Error generating stats:", e);
        }
    } else {
        // Instructions view
        if (i) i.classList.remove('d-none');
        generateReferenceTable();
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

// --- EVENT LISTENERS ---

function setupEventListeners() {
    console.log("Setting up event listeners...");

    // 1. Header & Navigation
    const headerBrand = document.getElementById('headerBrandLink');
    if (headerBrand) headerBrand.addEventListener('click', () => switchMainView('trainer'));

    const btnDarkMode = document.getElementById('darkModeToggleBtn');
    if (btnDarkMode) btnDarkMode.addEventListener('click', toggleDarkMode);

    const btnHeaderHelp = document.getElementById('btnHeaderHelp');
    if (btnHeaderHelp) btnHeaderHelp.addEventListener('click', () => switchMainView('instructions'));

    const btnHeaderStats = document.getElementById('btnHeaderStats');
    if (btnHeaderStats) {
        btnHeaderStats.addEventListener('click', () => {
            console.log("Stats button clicked");
            try {
                switchMainView('stats');
            } catch (e) {
                console.error("Error switching to stats:", e);
            }
        });
    } else {
        console.error("btnHeaderStats not found in DOM");
    }

    const btnHeaderInstrument = document.getElementById('btnHeaderInstrument');
    if (btnHeaderInstrument) btnHeaderInstrument.addEventListener('click', resetToStartScreen);

    const btnBackTrainer1 = document.getElementById('btnBackToTrainer1');
    if (btnBackTrainer1) btnBackTrainer1.addEventListener('click', () => switchMainView('trainer'));

    const btnBackTrainer2 = document.getElementById('btnBackToTrainer2');
    if (btnBackTrainer2) btnBackTrainer2.addEventListener('click', () => switchMainView('trainer'));

    const btnBackStats = document.getElementById('btnBackToTrainerStats');
    if (btnBackStats) btnBackStats.addEventListener('click', () => switchMainView('trainer'));

    // Privacy Modal
    const btnPrivacyAccept = document.getElementById('btnPrivacyAccept');
    if (btnPrivacyAccept) {
        btnPrivacyAccept.addEventListener('click', () => {
            localStorage.setItem('posaunePrivacyAccepted', 'true');
            const modal = bootstrap.Modal.getInstance(document.getElementById('privacyModal'));
            if (modal) modal.hide();
        });
    }

    // 2. Start Screen
    const cardTrombone = document.getElementById('cardStartTrombone');
    if (cardTrombone) cardTrombone.addEventListener('click', () => selectInstrument('trombone'));

    const cardTrumpet = document.getElementById('cardStartTrumpet');
    if (cardTrumpet) cardTrumpet.addEventListener('click', () => selectInstrument('trumpet'));

    // 3. Quiz Controls
    const diffSelectors = document.querySelectorAll('.diff-selector');
    diffSelectors.forEach(radio => {
        radio.addEventListener('change', (e) => setDifficultyOverride(parseInt(e.target.value)));
    });

    const micSwitch = document.getElementById('micModeSwitch');
    if (micSwitch) micSwitch.addEventListener('change', toggleMicMode);

    const btnQuizHint = document.getElementById('btnQuizHint');
    if (btnQuizHint) btnQuizHint.addEventListener('click', playQuizHint);

    const quizSlider = document.getElementById('quizSlideRange');
    if (quizSlider) {
        quizSlider.addEventListener('input', (e) => handleQuizInput(e.target.value));
        quizSlider.addEventListener('change', (e) => snapQuizInput(e.target.value));
    }

    // Quiz Visual Markers
    document.querySelectorAll('.quiz-marker').forEach(marker => {
        marker.addEventListener('click', () => {
            const pos = parseInt(marker.getAttribute('data-pos'));
            snapQuizInput(pos);
        });
    });

    // Quiz Valves
    document.querySelectorAll('.quiz-valve').forEach(valve => {
        valve.addEventListener('click', () => {
            const v = parseInt(valve.getAttribute('data-valve'));
            toggleValve(v, 'quiz');
        });
    });

    // Quiz Mobile Buttons
    document.querySelectorAll('.quiz-mobile-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pos = parseInt(btn.getAttribute('data-pos'));
            snapQuizInput(pos);
        });
    });

    const btnCheck = document.getElementById('checkAnswerBtn');
    if (btnCheck) btnCheck.addEventListener('click', checkQuizAnswer);

    const btnNext = document.getElementById('nextBtn');
    if (btnNext) btnNext.addEventListener('click', nextQuestion);

    // 4. Learn Controls
    const learnSlider = document.getElementById('learnSlideRange');
    if (learnSlider) {
        learnSlider.addEventListener('input', (e) => handleLearnInput(e.target.value));
        learnSlider.addEventListener('change', (e) => handleLearnRelease(e.target.value));
    }

    // Learn Visual Markers
    document.querySelectorAll('.learn-marker').forEach(marker => {
        marker.addEventListener('click', () => {
            const pos = parseInt(marker.getAttribute('data-pos'));
            handleLearnRelease(pos);
        });
    });

    // Learn Valves
    document.querySelectorAll('.learn-valve').forEach(valve => {
        valve.addEventListener('click', () => {
            const v = parseInt(valve.getAttribute('data-valve'));
            toggleValve(v, 'learn');
        });
    });

    // Learn Mobile Buttons
    document.querySelectorAll('.learn-mobile-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pos = parseInt(btn.getAttribute('data-pos'));
            setLearnPosition(pos);
        });
    });

    // 5. Theory & Footer
    const btnResetTheory = document.getElementById('btnResetTheory');
    if (btnResetTheory) btnResetTheory.addEventListener('click', resetTheoryQuiz);

    const btnShare = document.getElementById('btnShareProgress');
    if (btnShare) btnShare.addEventListener('click', () => shareProgressReport('native'));

    const btnShareWA = document.getElementById('btnShareWhatsApp');
    if (btnShareWA) btnShareWA.addEventListener('click', () => shareProgressReport('whatsapp'));
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("App initializing...");
    setupEventListeners();

    // Initial State
    resetToStartScreen();
    initGamification();
    initQuiz();
    setLearnPosition(1);
    initTheoryQuiz();
    generateReferenceTable();

    // Tab Change Listener
    const learnTabBtn = document.querySelector('button[data-bs-target="#pills-learn"]');
    if (learnTabBtn) {
        learnTabBtn.addEventListener('shown.bs.tab', () => {
            console.log("Learn Tab Shown - Forcing Re-render");
            appState.lastLearnRenderedNote = null;
            const slider = document.getElementById('learnSlideRange');
            if (slider) handleLearnInput(slider.value);
        });
    }

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

    // Check Privacy Acceptance
    const accepted = localStorage.getItem('posaunePrivacyAccepted_v2');

    if (!accepted) {
        const modalEl = document.getElementById('privacyModal');
        if (modalEl) {
            try {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            } catch (e) {
                console.error("Bootstrap modal error:", e);
            }
        }
    }
});

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
