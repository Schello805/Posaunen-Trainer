const { Renderer, Stave, StaveNote, Accidental, Formatter, Voice, Clef } = Vex.Flow;

// --- GAMIFICATION STATE ---
let userProgress = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    streak: 0,
    lastLogin: null,
    highScore: 0,
    // Neue Statistiken
    todayCorrect: 0,
    todayTotal: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    positionStats: { // Genauigkeit pro Position
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 },
        4: { correct: 0, total: 0 },
        5: { correct: 0, total: 0 },
        6: { correct: 0, total: 0 },
        7: { correct: 0, total: 0 }
    },
    // Level Requirements Tracking
    levelRequirements: {
        quizCorrect: 0,
        theoryCorrect: 0
    }
};

let currentQuizQuestion = null;
let quizActive = true;
let currentSliderSelection = 1;
let lastLearnRenderedNote = null;
let currentLearnPosInt = 1;
let streak = 0; // Session streak (richtige Antworten in Folge)
let difficultyOverride = 0; // 0 = Auto, 1-3 = Manuell

// --- THEORIE QUIZ ---
// Schwierigkeit: 1=Leicht, 2=Mittel, 3=Schwer, 4=Experte
const theoryQuestionsPool = [
    // LEICHT (Basics)
    { q: "Wie viele Zugpositionen hat eine Posaune?", options: ["7", "5", "3"], correct: 0, level: 1 },
    { q: "Was ist der tiefste Ton in der 1. Position (ohne Quartventil)?", options: ["B (Bb)", "F", "C"], correct: 0, level: 1 },
    { q: "In welchem Schlüssel liest man Posaune meistens?", options: ["Bassschlüssel", "Violinschlüssel", "Altschlüssel"], correct: 0, level: 1 },
    { q: "Aus welchem Material besteht eine Posaune meistens?", options: ["Messing", "Holz", "Silber"], correct: 0, level: 1 },
    { q: "Wie verändert sich der Ton, wenn man den Zug rauszieht?", options: ["Er wird tiefer", "Er wird höher", "Er bleibt gleich"], correct: 0, level: 1 },
    { q: "Welches Teil vibriert, um den Ton zu erzeugen?", options: ["Die Lippen", "Der Zug", "Der Schallbecher"], correct: 0, level: 1 },
    { q: "Was macht die Wasserklappe?", options: ["Kondenswasser ablassen", "Luft reinlassen", "Den Ton verändern"], correct: 0, level: 1 },
    { q: "Wie nennt man das Mundstück der Posaune?", options: ["Kesselmundstück", "Schnabel", "Rohrblatt"], correct: 0, level: 1 },
    { q: "Welche Hand bewegt den Zug?", options: ["Die Rechte", "Die Linke", "Beide"], correct: 0, level: 1 },
    { q: "Wo ist die 1. Position?", options: ["Zug ganz drin", "Zug ganz draußen", "In der Mitte"], correct: 0, level: 1 },

    // MITTEL (Positionen & Noten)
    { q: "Welcher Ton liegt auf der 1. Position (neben dem tiefen B)?", options: ["F", "G", "A"], correct: 0, level: 2 },
    { q: "Auf welcher Position liegt das kleine c?", options: ["3. Position", "1. Position", "6. Position"], correct: 0, level: 2 },
    { q: "Wie weit sind die Positionen ca. voneinander entfernt?", options: ["ca. 8 cm", "ca. 20 cm", "ca. 2 cm"], correct: 0, level: 2 },
    { q: "Welcher Ton ist in der 6. Position?", options: ["C", "B", "F"], correct: 0, level: 2 },
    { q: "Was ist ein 'Naturton'?", options: ["Ton ohne Zugbewegung", "Ein Ton aus Holz", "Ein falscher Ton"], correct: 0, level: 2 },
    { q: "Wie nennt man das gleitende Verbinden von Tönen?", options: ["Glissando", "Staccato", "Legato"], correct: 0, level: 2 },
    { q: "Was bedeutet 'f' (forte) in der Musik?", options: ["Laut", "Falsch", "Fein"], correct: 0, level: 2 },
    { q: "Was bedeutet 'p' (piano) in der Musik?", options: ["Leise", "Posaune", "Pause"], correct: 0, level: 2 },
    { q: "Welches Intervall ist zwischen 1. und 2. Position?", options: ["Ein Halbton", "Ein Ganzton", "Eine Terz"], correct: 0, level: 2 },
    { q: "Auf welcher Position liegt das kleine g?", options: ["4. Position", "2. Position", "1. Position"], correct: 0, level: 2 },

    // SCHWER (Theorie & Technik)
    { q: "Was bewirkt das Quartventil?", options: ["Erweitert Tonumfang nach unten", "Macht Töne höher", "Dämpft den Ton"], correct: 0, level: 3 },
    { q: "Welches Intervall umfasst der gesamte Zug (Pos 1-7)?", options: ["Verminderte Quinte (Tritonus)", "Quarte", "Oktave"], correct: 0, level: 3 },
    { q: "Was ist ein 'Hilfsgriff'?", options: ["Alternative Zugposition", "Ein Griff zum Festhalten", "Ein falscher Ton"], correct: 0, level: 3 },
    { q: "Wo liegt das eingestrichene d' alternativ zur 1. Position?", options: ["4. Position", "3. Position", "6. Position"], correct: 0, level: 3 },
    { q: "Was ist der 'Ansatz'?", options: ["Lippenspannung & Mundstellung", "Das Ansetzen des Zuges", "Der Anfang eines Stücks"], correct: 0, level: 3 },
    { q: "In welcher Stimmung ist eine Standard-Posaune?", options: ["B (Bb)", "C", "Es"], correct: 0, level: 3 },
    { q: "Was ist eine 'Alt-Posaune'?", options: ["Eine kleinere, höhere Posaune", "Eine tiefere Posaune", "Eine alte Posaune"], correct: 0, level: 3 },
    { q: "Welcher Schlüssel wird für sehr hohe Posaunenstimmen genutzt?", options: ["Tenorschlüssel", "Violinschlüssel", "Bassschlüssel"], correct: 0, level: 3 },
    { q: "Was ist ein Dämpfer (Mute)?", options: ["Gerät zur Klangveränderung", "Ein leiser Spieler", "Ein Ventil"], correct: 0, level: 3 },
    { q: "Wie nennt man Singen und Spielen gleichzeitig?", options: ["Multiphonics", "Zirkularatmung", "Dämpfer"], correct: 0, level: 3 },

    // EXPERTE (Details & Geschichte)
    { q: "Wie hieß der Vorläufer der Posaune?", options: ["Sackbut", "Trompete", "Tuba"], correct: 0, level: 4 },
    { q: "Was ist die 'Schnecke' am Stimmzug?", options: ["Eine Windung (Platzersparnis)", "Ein Tier", "Ein Fehler"], correct: 0, level: 4 },
    { q: "Welcher Ton ist der 7. Naturton (oft zu tief)?", options: ["as' (auf B-Posaune)", "f'", "b'"], correct: 0, level: 4 },
    { q: "Was ist 'Zirkularatmung'?", options: ["Atmen ohne Tonunterbrechung", "Schnell atmen", "Durch die Nase spielen"], correct: 0, level: 4 },
    { q: "Wie lang ist das Rohr einer B-Posaune insgesamt (ca.)?", options: ["270 cm", "150 cm", "400 cm"], correct: 0, level: 4 },
    { q: "Was unterscheidet die Bassposaune von der Tenorposaune?", options: ["Größere Bohrung", "Längerer Zug", "Anderes Material"], correct: 0, level: 4 },
    { q: "Welches Material macht den Klang 'wärmer'?", options: ["Goldmessing", "Gelbmessing", "Neusilber"], correct: 0, level: 4 },
    { q: "Was ist ein 'Trigger'?", options: ["Hebel für das Ventil", "Der Abzug", "Ein schneller Ton"], correct: 0, level: 4 },
    { q: "In welchem Jahrhundert entstand die Posaune etwa?", options: ["15. Jahrhundert", "18. Jahrhundert", "12. Jahrhundert"], correct: 0, level: 4 },
    { q: "Was ist der 'Pedalton' der B-Posaune physikalisch?", options: ["Das Kontra-B", "Das große B", "Das tiefe F"], correct: 0, level: 4 }
];

let activeTheoryQuestions = [];
let currentTheoryIndex = 0;
let theoryCorrectCount = 0;
let theoryWrongCount = 0;

// --- THEORIE QUIZ FUNCTIONS ---
function initTheoryQuiz() {
    // Mische alle Fragen und wähle 15 zufällige aus
    // Oder wir nehmen alle, aber gemischt. User wollte "random geladen".
    // Nehmen wir 20 Fragen pro Runde für eine gute Länge.
    const shuffled = [...theoryQuestionsPool].sort(() => 0.5 - Math.random());
    activeTheoryQuestions = shuffled.slice(0, 20);

    currentTheoryIndex = 0;
    theoryCorrectCount = 0;
    theoryWrongCount = 0;

    loadTheoryCard();
}

function loadTheoryCard() {
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
            <button class="btn btn-primary btn-lg mt-3" onclick="initTheoryQuiz()">
                <i class="bi bi-arrow-clockwise"></i> Neues Quiz starten
            </button>
        `;
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

    // Erstelle Array mit Indizes [0, 1, 2] und mische sie für die Anzeige
    let indices = [0, 1, 2];
    indices.sort(() => 0.5 - Math.random());

    indices.forEach(idx => {
        const btn = document.createElement('button');
        btn.className = "btn btn-outline-dark text-start p-3 mb-2 w-100 fw-bold theory-opt-btn";
        btn.innerHTML = `<i class="bi bi-circle me-2"></i> ${card.options[idx]}`;
        btn.onclick = () => checkTheoryAnswer(idx, btn, card.correct);
        optionsContainer.appendChild(btn);
    });

    // Update progress
    const progress = (currentTheoryIndex / activeTheoryQuestions.length) * 100;
    document.getElementById('theoryProgress').style.width = progress + '%';
    document.getElementById('theoryCorrect').textContent = theoryCorrectCount;
    document.getElementById('theoryWrong').textContent = theoryWrongCount;
}

function checkTheoryAnswer(selectedIdx, btnElement, correctIdx) {
    // Disable all buttons
    const allBtns = document.querySelectorAll('.theory-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    if (selectedIdx === correctIdx) {
        // Richtig
        btnElement.classList.remove('btn-outline-dark');
        btnElement.classList.add('btn-success');
        btnElement.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> ${btnElement.innerText}`;
        theoryCorrectCount++;

        // Level 1 Requirement Tracking
        if (userProgress.level === 1) {
            userProgress.levelRequirements.theoryCorrect++;
            saveProgress(); // Save immediately
        }

        addXP(5);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    } else {
        // Falsch
        btnElement.classList.remove('btn-outline-dark');
        btnElement.classList.add('btn-danger');
        btnElement.innerHTML = `<i class="bi bi-x-circle-fill me-2"></i> ${btnElement.innerText}`;
        theoryWrongCount++;

        // Zeige richtige Antwort
        allBtns.forEach(b => {
            if (b.innerText.includes(activeTheoryQuestions[currentTheoryIndex].options[correctIdx])) {
                b.classList.remove('btn-outline-dark');
                b.classList.add('btn-success');
            }
        });
    }

    // Nächste Frage nach kurzer Verzögerung
    setTimeout(() => {
        currentTheoryIndex++;
        loadTheoryCard();
    }, 1500);
}

function resetTheoryQuiz() {
    initTheoryQuiz();
}

// --- DATENBASIS (B-Dur Anfänger) ---
const positionMap = {
    1: [
        { text: "B", key: "bb/2", level: 1, isBeginner: true, freq: 116.54 },
        { text: "F", key: "f/3", level: 1, isBeginner: true, freq: 174.61 },
        { text: "b", key: "bb/3", level: 1, isBeginner: true, freq: 233.08 },
        { text: "d", key: "d/4", level: 2, freq: 293.66 },
        { text: "f", key: "f/4", level: 3, freq: 349.23 }
    ],
    2: [
        { text: "A", key: "a/2", level: 1, isBeginner: true, freq: 110.00 },
        { text: "E", key: "e/3", level: 1, isBeginner: true, freq: 164.81 },
        { text: "a", key: "a/3", level: 1, isBeginner: true, freq: 220.00 },
        { text: "cis", key: "c#/4", level: 3, freq: 277.18 }
    ],
    3: [
        { text: "As", key: "ab/2", level: 2, freq: 103.83 },
        { text: "Es", key: "eb/3", level: 1, isBeginner: true, freq: 155.56 },
        { text: "as", key: "ab/3", level: 2, freq: 207.65 },
        { text: "c", key: "c/4", level: 1, isBeginner: true, freq: 261.63 }
    ],
    4: [
        { text: "G", key: "g/2", level: 1, isBeginner: true, freq: 98.00 },
        { text: "D", key: "d/3", level: 1, isBeginner: true, freq: 146.83 },
        { text: "g", key: "g/3", level: 1, isBeginner: true, freq: 196.00 },
        { text: "h", key: "b/3", level: 2, freq: 246.94 }
    ],
    5: [
        { text: "Ges", key: "gb/2", level: 2, freq: 92.50 },
        { text: "Des", key: "db/3", level: 2, freq: 138.59 },
        { text: "ges", key: "gb/3", level: 2, freq: 185.00 }
    ],
    6: [
        { text: "F (tief)", key: "f/2", level: 2, freq: 87.31 },
        { text: "C", key: "c/3", level: 1, isBeginner: true, freq: 130.81 }
    ],
    7: [
        { text: "E (tief)", key: "e/2", level: 2, freq: 82.41 },
        { text: "H", key: "b/2", level: 2, freq: 123.47 }
    ]
};

// --- GAMIFICATION LOGIC ---
function initGamification() {
    const saved = localStorage.getItem('posauneProgress');
    if (saved) {
        userProgress = JSON.parse(saved);

        // Migration: Fehlende Felder hinzufügen
        if (!userProgress.todayCorrect) userProgress.todayCorrect = 0;
        if (!userProgress.todayTotal) userProgress.todayTotal = 0;
        if (!userProgress.totalCorrect) userProgress.totalCorrect = 0;
        if (!userProgress.totalQuestions) userProgress.totalQuestions = 0;
        if (!userProgress.positionStats) {
            userProgress.positionStats = {
                1: { correct: 0, total: 0 },
                2: { correct: 0, total: 0 },
                3: { correct: 0, total: 0 },
                4: { correct: 0, total: 0 },
                5: { correct: 0, total: 0 },
                6: { correct: 0, total: 0 },
                7: { correct: 0, total: 0 }
            };
        }
        if (!userProgress.levelRequirements) {
            userProgress.levelRequirements = { quizCorrect: 0, theoryCorrect: 0 };
        }
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
            if (userProgress.lastLogin) userProgress.streak = 1;
            else userProgress.streak = 1;
        }

        // Reset daily stats
        userProgress.todayCorrect = 0;
        userProgress.todayTotal = 0;

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
    // Check Requirements for Level 1 -> 2
    if (userProgress.level === 1) {
        const reqQuiz = 20;
        const reqTheory = 10;

        if (userProgress.levelRequirements.quizCorrect < reqQuiz || userProgress.levelRequirements.theoryCorrect < reqTheory) {
            // Requirements not met yet. Accumulate XP but don't level up.
            // Maybe cap XP? For now just let it overflow or stay at max.
            // Actually, let's keep XP at max-1 to show they are ready but need to finish tasks.
            if (userProgress.xp >= userProgress.xpToNext) {
                userProgress.xp = userProgress.xpToNext - 1;
            }
            saveProgress();

            // Show a toast or small alert? 
            // Better: updateUIStats handles the display of requirements.
            return;
        }
    }

    userProgress.level++;
    userProgress.xp -= userProgress.xpToNext;
    userProgress.xpToNext = Math.floor(userProgress.xpToNext * 1.5);

    // Reset requirements for next level (if we add more later)
    userProgress.levelRequirements = { quizCorrect: 0, theoryCorrect: 0 };

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

    // Level Requirements Display (Only for Level 1 for now)
    const reqDisplay = document.getElementById('levelRequirementsContainer');
    if (userProgress.level === 1) {
        if (reqDisplay) {
            const q = userProgress.levelRequirements.quizCorrect;
            const t = userProgress.levelRequirements.theoryCorrect;
            const qReq = 20;
            const tReq = 10;

            let html = "";
            // Shorten text for mobile if needed, or just use icons
            if (q < qReq) html += `<span class="me-2" title="Quiz Richtige"><i class="bi bi-controller"></i> ${q}/${qReq}</span>`;
            else html += `<span class="me-2 text-success" title="Quiz Fertig"><i class="bi bi-check-circle-fill"></i> Quiz</span>`;

            if (t < tReq) html += `<span title="Theorie Richtige"><i class="bi bi-lightbulb"></i> ${t}/${tReq}</span>`;
            else html += `<span class="text-success" title="Theorie Fertig"><i class="bi bi-check-circle-fill"></i> Theorie</span>`;

            reqDisplay.innerHTML = html;
            reqDisplay.classList.remove('d-none');
            reqDisplay.classList.add('d-flex');

            // Update Goal Card in Quiz Tab
            const goalCard = document.getElementById('level1GoalCard');
            if (goalCard) {
                goalCard.classList.remove('d-none');
                document.getElementById('goalQuizDisplay').innerHTML = (q < qReq)
                    ? `<i class="bi bi-controller"></i> Quiz: <strong>${q}/${qReq}</strong>`
                    : `<span class="text-success"><i class="bi bi-check-circle-fill"></i> Quiz: Fertig!</span>`;

                document.getElementById('goalTheoryDisplay').innerHTML = (t < tReq)
                    ? `<i class="bi bi-lightbulb"></i> Theorie: <strong>${t}/${tReq}</strong>`
                    : `<span class="text-success"><i class="bi bi-check-circle-fill"></i> Theorie: Fertig!</span>`;
            }
        }
    } else {
        if (reqDisplay) {
            reqDisplay.classList.add('d-none');
            reqDisplay.classList.remove('d-flex');
        }
        // Hide Goal Card if not Level 1
        const goalCard = document.getElementById('level1GoalCard');
        if (goalCard) goalCard.classList.add('d-none');
    }
}

// --- LOGIC: Questions based on Level ---
function getAllowedPositions(lvl) {
    if (lvl === 1) return [1, 2, 3, 4, 6]; // B-Dur braucht 1, 2(A), 3(Es), 4(D,G), 6(C)
    if (lvl === 2) return [1, 2, 3, 4, 5, 6, 7]; // Alle Positionen, aber einfachere Töne
    return [1, 2, 3, 4, 5, 6, 7]; // Alles
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

function setDifficultyOverride(level) {
    difficultyOverride = level;
    document.getElementById('autoLevelDisplay').textContent = userProgress.level;
    nextQuestion(); // Neue Frage mit neuer Schwierigkeit
}

function getEffectiveLevel() {
    return difficultyOverride === 0 ? userProgress.level : difficultyOverride;
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

    // Dynamic Centering
    const staveWidth = 210;
    const effectiveWidth = 350 / 1.5; // ~233.33
    const staveX = (effectiveWidth - staveWidth) / 2; // ~11.66

    const s = new Stave(staveX, 10, staveWidth); s.addClef("bass"); s.setContext(ctx).draw();
    const n = new StaveNote({ keys: keys, duration: "w", clef: "bass", align_center: true });
    if (isGhost) n.setStyle({ fillStyle: "#999", strokeStyle: "#999" });
    keys.forEach((k, i) => {
        const notePart = k.split('/')[0].trim();
        const acc = notePart.substring(1); // Everything after the letter (e.g. 'b', 'bb', '#')

        if (acc === 'b') addModifierToNote(n, new Vex.Flow.Accidental('b'), i);
        if (acc === 'bb') addModifierToNote(n, new Vex.Flow.Accidental('bb'), i);
        if (acc === '#') addModifierToNote(n, new Vex.Flow.Accidental('#'), i);
    });
    const v = new Voice({ num_beats: 4, beat_value: 4 }); v.addTickables([n]);
    new Formatter().joinVoices([v]).format([v], 150); v.draw(ctx, s);

    const svg = div.querySelector('svg');
    if (svg) {
        svg.setAttribute('viewBox', '0 0 350 150');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.width = "100%";
        svg.style.height = "100%";
    }
}

function addModifierToNote(note, modifier, index) {
    // Robust check for VexFlow version signature differences
    // VexFlow 4.x: addModifier(modifier, index)
    // VexFlow 3.x: addModifier(index, modifier)

    // Check if the 'modifier' object looks like a VexFlow Modifier (has getCategory or is instance)
    // We can try to detect which signature the method expects, but easier to check the object.

    // If we are in a version where the first argument should be the index (number),
    // but we passed an object, we need to swap.

    // However, we can't easily inspect the method.
    // Let's try to detect the version more reliably or just try/catch.

    // Better approach: Check if VexFlow 3.x is active.
    // The user reported "e.setNote is not a function" which happens when 3.x receives (modifier, index).
    // So we should default to (index, modifier) if we are unsure, OR try to detect.

    // Let's try to use the 3.x signature if the version string starts with 3, 
    // OR if it's undefined (often the case in minified 3.x).
    const version = Vex.Flow.VERSION;

    if (version && version.startsWith("4.")) {
        note.addModifier(modifier, index);
    } else {
        // Fallback for 3.x (or undefined version)
        note.addModifier(index, modifier);
    }
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
            btn.onclick = () => {
                // Update Active State
                document.querySelectorAll('.note-chip').forEach(b => b.classList.remove('active-note'));
                btn.classList.add('active-note');
                playSingleNote(n);
            };
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

    // Dynamic Centering
    const staveWidth = 210;
    const effectiveWidth = 350 / 1.5;
    const staveX = (effectiveWidth - staveWidth) / 2;

    const s = new Stave(staveX, 10, staveWidth); s.addClef("bass"); s.setContext(ctx).draw();
    const svg = div.querySelector('svg');
    if (svg) {
        svg.setAttribute('viewBox', '0 0 350 150');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.width = "100%";
        svg.style.height = "100%";
    }
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

    // Update statistics
    userProgress.todayTotal++;
    userProgress.totalQuestions++;
    userProgress.positionStats[currentQuizQuestion.correct].total++;

    if (userPos === currentQuizQuestion.correct) {
        // Correct
        userProgress.todayCorrect++;
        userProgress.totalCorrect++;
        userProgress.positionStats[currentQuizQuestion.correct].correct++;

        // Level 1 Requirement Tracking
        if (userProgress.level === 1) {
            userProgress.levelRequirements.quizCorrect++;
        }

        addXP(10 + (userProgress.streak > 0 ? 5 : 0));
        streak++;

        fb.className = "feedback-badge bg-success text-white";
        fb.innerHTML = `<strong>Richtig!</strong> <i class="bi bi-music-note-beamed"></i> (+10 XP) | Heute: ${userProgress.todayCorrect}/${userProgress.todayTotal}`;
        staff.classList.add('correct');
        playBrassTone(currentQuizQuestion.freq);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

        // Vibration bei Erfolg (Mobile)
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    } else {
        streak = 0;
        fb.className = "feedback-badge bg-danger text-white";
        fb.innerHTML = `<strong>Falsch.</strong> Die richtige Position ist <strong>${currentQuizQuestion.correct}</strong>`;
        staff.classList.add('wrong');
        playBrassTone(80);

        // Move slide to correct position automatically
        setTimeout(() => {
            snapQuizInput(currentQuizQuestion.correct);
            playBrassTone(currentQuizQuestion.freq);
        }, 800);
    }

    // Update UI
    updateUIStats();
    saveProgress();

    fb.style.display = 'block';
    document.getElementById('checkAnswerBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'block';
    quizActive = false;
}

function switchMainView(v) {
    const t = document.getElementById('view-trainer');
    const i = document.getElementById('view-instructions');

    if (v === 'trainer') {
        t.classList.remove('d-none');
        i.classList.add('d-none');
        if (currentQuizQuestion) renderVexFlowNotes("quizStaff", [currentQuizQuestion.key]);
    } else {
        t.classList.add('d-none');
        i.classList.remove('d-none');
        // Generate table and stats when switching to instructions
        if (typeof generateReferenceTable === 'function') {
            generateReferenceTable();
        }
        if (typeof generateStats === 'function') {
            generateStats();
        }
    }

    const nb = document.getElementById('navbarNav');
    if (nb && nb.classList.contains('show')) new bootstrap.Collapse(nb).hide();
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

// --- TABLE GENERATION ---
function renderNoteThumbnail(container, noteKey) {
    const div = document.createElement('div');
    div.className = 'mini-staff';
    container.appendChild(div);
    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(80, 60);
    const ctx = renderer.getContext();
    ctx.scale(0.6, 0.6);
    const stave = new Stave(0, 0, 130);
    stave.setContext(ctx).draw();
    const note = new StaveNote({ keys: [noteKey], duration: "w", clef: "bass", align_center: true });
    if (noteKey.includes('bb')) addModifierToNote(note, new Vex.Flow.Accidental('bb'), 0);
    else if (noteKey.includes('b')) addModifierToNote(note, new Vex.Flow.Accidental('b'), 0);
    if (noteKey.includes('#')) addModifierToNote(note, new Vex.Flow.Accidental('#'), 0);
    const voice = new Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables([note]);
    new Formatter().joinVoices([voice]).format([voice], 100);
    voice.draw(ctx, stave);
}

function generateReferenceTable() {
    const tbody = document.querySelector('#referenceTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (let pos = 1; pos <= 7; pos++) {
        const row = document.createElement('tr');
        const notes = positionMap[pos];
        const beginnerNotes = notes.filter(n => n.isBeginner);
        const advNotes = notes.filter(n => n.level === 2 && !n.isBeginner);
        const proNotes = notes.filter(n => n.level === 3 && !n.isBeginner);

        const tdPos = document.createElement('td');
        tdPos.innerHTML = `<span class="badge bg-secondary rounded-pill">${pos}</span>`;
        row.appendChild(tdPos);

        const td1 = document.createElement('td');
        if (beginnerNotes.length > 0) {
            beginnerNotes.forEach(n => {
                const d = document.createElement('div');
                d.className = "d-inline-block text-center m-1";
                d.innerHTML = `<div><strong>${n.text}</strong></div>`;
                renderNoteThumbnail(d, n.key);
                td1.appendChild(d);
            });
        } else td1.innerText = "-";
        row.appendChild(td1);

        const td2 = document.createElement('td');
        if (advNotes.length > 0) {
            advNotes.forEach(n => {
                const d = document.createElement('div');
                d.className = "d-inline-block text-center m-1";
                d.innerHTML = `<div><small>${n.text}</small></div>`;
                renderNoteThumbnail(d, n.key);
                td2.appendChild(d);
            });
        } else td2.innerText = "-";
        row.appendChild(td2);

        const td3 = document.createElement('td');
        if (proNotes.length > 0) {
            proNotes.forEach(n => {
                const d = document.createElement('div');
                d.className = "d-inline-block text-center m-1";
                d.innerHTML = `<div><small>${n.text}</small></div>`;
                renderNoteThumbnail(d, n.key);
                td3.appendChild(d);
            });
        } else td3.innerText = "-";
        row.appendChild(td3);
        tbody.appendChild(row);
    }
}

function generateStats() {
    // Update overall stats
    document.getElementById('statTodayCorrect').textContent = userProgress.todayCorrect;
    document.getElementById('statTodayTotal').textContent = userProgress.todayTotal;
    document.getElementById('statTotalCorrect').textContent = userProgress.totalCorrect;
    document.getElementById('statTotalQuestions').textContent = userProgress.totalQuestions;

    const accuracy = userProgress.totalQuestions > 0
        ? Math.round((userProgress.totalCorrect / userProgress.totalQuestions) * 100)
        : 0;
    document.getElementById('statAccuracy').textContent = accuracy + '%';

    // Position stats
    const container = document.getElementById('positionStatsContainer');
    if (!container) return;
    container.innerHTML = '';

    for (let pos = 1; pos <= 7; pos++) {
        const stats = userProgress.positionStats[pos];
        const posAccuracy = stats.total > 0
            ? Math.round((stats.correct / stats.total) * 100)
            : 0;

        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center mb-1';

        let badgeClass = 'bg-secondary';
        if (posAccuracy >= 80) badgeClass = 'bg-success';
        else if (posAccuracy >= 60) badgeClass = 'bg-warning';
        else if (stats.total > 0) badgeClass = 'bg-danger';

        div.innerHTML = `
            <span>Position ${pos}:</span>
            <span>
                <span class="badge ${badgeClass}">${posAccuracy}%</span>
                <span class="text-muted ms-1">(${stats.correct}/${stats.total})</span>
            </span>
        `;
        container.appendChild(div);
    }
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
    initTheoryQuiz(); // Init Theorie Quiz

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

    // Old stats init removed as they are handled by initGamification now

    if (typeof generateReferenceTable === 'function') generateReferenceTable();
});
