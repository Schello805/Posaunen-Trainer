import { userProgress, getCurrentUserProgress, appState } from './state.js';
import { getInstrumentData } from './data.js';
import { saveProgress, addXP } from './gamification.js';
import { updateUIStats } from './ui.js';

let activeTheoryQuestions = [];
let currentTheoryIndex = 0;
let theoryCorrectCount = 0;
let theoryWrongCount = 0;

export function initTheoryQuiz() {
    const inst = getInstrumentData(appState.selectedInstrument || 'trombone');
    const pool = inst.questions;
    
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    activeTheoryQuestions = shuffled.slice(0, 20);

    currentTheoryIndex = 0;
    theoryCorrectCount = 0;
    theoryWrongCount = 0;

    loadTheoryCard();
}

export function loadTheoryCard() {
    if (currentTheoryIndex >= activeTheoryQuestions.length) {
        // Quiz beendet
        const percent = Math.round((theoryCorrectCount / activeTheoryQuestions.length) * 100);
        let msg = "Gut gemacht!";
        if (percent >= 90) msg = "Exzellent! Ein echter Profi!";
        else if (percent >= 70) msg = "Sehr gut!";
        else if (percent < 50) msg = "Übung macht den Meister.";

        document.getElementById('theoryQuestion').innerHTML = `
            <i class="bi bi-trophy-fill text-warning display-1"></i><br>
            <h3 class="mt-3">Quiz beendet!</h3>
            <p class="lead">${msg}</p>
            <div class="alert alert-secondary d-inline-block">
                ${theoryCorrectCount} von ${activeTheoryQuestions.length} richtig (${percent}%)
            </div>
        `;
        document.getElementById('theoryOptions').innerHTML = `
            <button class="btn btn-primary btn-lg mt-3" id="resetTheoryBtn">
                <i class="bi bi-arrow-clockwise"></i> Neues Quiz starten
            </button>
        `;

        // Manual binding since inline onclick won't work with modules easily for dynamic content
        document.getElementById('resetTheoryBtn').addEventListener('click', () => initTheoryQuiz());

        document.getElementById('theoryCardNum').textContent = "-";
        return;
    }

    const card = activeTheoryQuestions[currentTheoryIndex];
    document.getElementById('theoryQuestion').textContent = card.q;
    document.getElementById('theoryCardNum').textContent = currentTheoryIndex + 1;
    document.getElementById('theoryCardTotal').textContent = activeTheoryQuestions.length;

    // Optionen rendern
    const optionsContainer = document.getElementById('theoryOptions');
    optionsContainer.innerHTML = '';

    // Erstelle Array mit Indizes [0, 1, 2] und mische sie
    let indices = [0, 1, 2];
    indices.sort(() => 0.5 - Math.random());

    indices.forEach(idx => {
        const btn = document.createElement('button');
        btn.className = "btn btn-outline-dark text-start p-3 mb-2 w-100 fw-bold theory-opt-btn";
        btn.innerHTML = `<i class="bi bi-circle me-2"></i> ${card.options[idx]}`;

        // Module-safe event listener
        btn.onclick = () => checkTheoryAnswer(idx, btn, card.correct);

        optionsContainer.appendChild(btn);
    });

    // Update progress
    const totalQ = activeTheoryQuestions.length || 20;
    // Show "Current Question" progress (e.g. Q1 is 1/20 = 5%)
    const progressPct = Math.round(((currentTheoryIndex + 1) / totalQ) * 100);
    console.log(`Theory Quiz Progress: ${progressPct}% (Q${currentTheoryIndex + 1}/${totalQ})`);

    // Use the standard ID again
    const progressBar = document.getElementById('theoryProgress');

    if (progressBar) {
        progressBar.style.width = `${progressPct}%`;
        progressBar.setAttribute('aria-valuenow', progressPct);
        // Show text if bar is wide enough, else just %
        progressBar.textContent = progressPct > 10 ? `${progressPct}%` : "";
        progressBar.classList.remove('bg-info');
        progressBar.classList.add('bg-success');
    } else {
        // Fallback or retry with the internal ID if HTML wasn't updated in cache
        const altBar = document.getElementById('theoryProgressBarInternal');
        if (altBar) {
            altBar.style.width = `${progressPct}%`;
            altBar.textContent = `${progressPct}%`;
            altBar.classList.add('bg-success');
        }
    }

    document.getElementById('theoryCorrect').textContent = theoryCorrectCount;
    document.getElementById('theoryWrong').textContent = theoryWrongCount;
}

function checkTheoryAnswer(selectedIdx, btnElement, correctIdx) {
    if (selectedIdx === correctIdx) {
        // RICHTIG
        const allBtns = document.querySelectorAll('.theory-opt-btn');
        allBtns.forEach(b => b.disabled = true); // Alle deaktivieren

        btnElement.classList.remove('btn-outline-dark');
        btnElement.classList.add('btn-success');
        btnElement.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> ${btnElement.innerText}`;
        
        theoryCorrectCount++;

        // Level 1 Requirement Tracking
        const stats = getCurrentUserProgress();
        if (stats.level === 1) {
            stats.levelRequirements.theoryCorrect++;
            saveProgress();
            updateUIStats();
        }

        addXP(5);
        if (window.confetti) window.confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });

        // Nächste Frage erst wenn richtig
        setTimeout(() => {
            currentTheoryIndex++;
            loadTheoryCard();
        }, 1500);
    } else {
        // FALSCH
        btnElement.classList.remove('btn-outline-dark');
        btnElement.classList.add('btn-danger');
        btnElement.innerHTML = `<i class="bi bi-x-circle-fill me-2"></i> ${btnElement.innerText}`;
        btnElement.disabled = true; // Nur diesen Button deaktivieren
        
        theoryWrongCount++;

        // Wir verraten NICHT die Lösung und springen NICHT weiter.
        // Der User muss weiter raten.
    }
}

export function resetTheoryQuiz() {
    initTheoryQuiz();
}
