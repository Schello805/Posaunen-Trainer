
import { userProgress, appState, getCurrentUserProgress } from './state.js';
import { getInstrumentData } from './data.js';
import { renderNoteThumbnail } from './score-renderer.js';

export function updateUIStats() {
    const stats = getCurrentUserProgress();
    
    const lvlEl = document.getElementById('displayLevel');
    const xpBar = document.getElementById('xpProgressBar');
    const streakEl = document.getElementById('displayStreak');

    if (lvlEl) lvlEl.innerText = stats.level;
    // Streak is global
    if (streakEl) streakEl.innerText = userProgress.streak;

    if (xpBar) {
        const pct = (stats.xp / stats.xpToNext) * 100;
        xpBar.style.width = `${pct}%`;
    }

    // Level Requirements Display (Level 1)
    const reqDisplay = document.getElementById('levelRequirementsContainer');
    const quizBarTitle = document.getElementById('quizProgressTitle');
    const quizBarBadge = document.getElementById('quizProgressBadge');
    const quizBar = document.getElementById('quizProgressBar');

    if (stats.level === 1) {
        // --- LEVEL 1 LOGIC ---
        const q = stats.levelRequirements.quizCorrect;
        const t = stats.levelRequirements.theoryCorrect;
        const qReq = 20;
        const tReq = 10;

        // Update Progress Bar (Focus on Quiz Req)
        if (quizBarTitle) quizBarTitle.textContent = "Level Aufstieg (Quiz)";
        if (quizBarBadge) quizBarBadge.textContent = `${q} / ${qReq}`;
        if (quizBar) {
            const pct = Math.min(100, (q / qReq) * 100);
            quizBar.style.width = `${pct}%`;
            quizBar.className = pct >= 100 ? "progress-bar bg-success" : "progress-bar bg-warning";
        }

        // Header Display
        if (reqDisplay) {
            let html = "";
            if (q < qReq) html += `<span class="me-2" title="Quiz Richtige"><i class="bi bi-controller"></i> ${q}/${qReq}</span>`;
            else html += `<span class="me-2 text-success" title="Quiz Fertig"><i class="bi bi-check-circle-fill"></i> Quiz</span>`;

            if (t < tReq) html += `<span title="Theorie Richtige"><i class="bi bi-lightbulb"></i> ${t}/${tReq}</span>`;
            else html += `<span class="text-success" title="Theorie Fertig"><i class="bi bi-check-circle-fill"></i> Theorie</span>`;

            reqDisplay.innerHTML = html;
            reqDisplay.classList.remove('d-none');
            reqDisplay.classList.add('d-flex');
        }

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
    } else {
        // --- LEVEL > 1 Logic (Daily Goal) ---
        const dailyGoal = 20; // Arbitrary daily goal
        const current = stats.todayCorrect;

        if (quizBarTitle) quizBarTitle.textContent = "Tagesziel (Richtig)";
        if (quizBarBadge) quizBarBadge.textContent = `${current} / ${dailyGoal}`;
        if (quizBar) {
            const pct = Math.min(100, (current / dailyGoal) * 100);
            quizBar.style.width = `${pct}%`;
            quizBar.className = pct >= 100 ? "progress-bar bg-success" : "progress-bar bg-info";
        }

        if (reqDisplay) {
            reqDisplay.classList.add('d-none');
            reqDisplay.classList.remove('d-flex');
        }
        const goalCard = document.getElementById('level1GoalCard');
        if (goalCard) goalCard.classList.add('d-none');
    }
}

export function generateReferenceTable() {
    const tbody = document.querySelector('#referenceTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const inst = getInstrumentData(appState.selectedInstrument || 'trombone');
    const map = inst.positions;

    for (let pos = 1; pos <= 7; pos++) {
        const row = document.createElement('tr');
        const notes = map[pos];
        if (!notes) continue; // Should not happen if data is complete

        const beginnerNotes = notes.filter(n => n.isBeginner);
        const advNotes = notes.filter(n => n.level === 2 && !n.isBeginner);
        const proNotes = notes.filter(n => n.level === 3 && !n.isBeginner);

        const tdPos = document.createElement('td');
        // Use label if available (e.g. "12" for valve), else pos number
        const label = inst.labels[pos - 1] || pos;
        tdPos.innerHTML = `<span class="badge bg-secondary rounded-pill">${label}</span>`;
        row.appendChild(tdPos);

        const td1 = document.createElement('td');
        if (beginnerNotes.length > 0) {
            beginnerNotes.forEach(n => {
                const d = document.createElement('div');
                d.className = "d-inline-block text-center m-1";
                d.innerHTML = `<div><strong>${n.text}</strong></div>`;
                renderNoteThumbnail(d, n.key, inst.clef);
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
                renderNoteThumbnail(d, n.key, inst.clef);
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
                renderNoteThumbnail(d, n.key, inst.clef);
                td3.appendChild(d);
            });
        } else td3.innerText = "-";
        row.appendChild(td3);
        tbody.appendChild(row);
    }
}

export function generateStats() {
    const stats = getCurrentUserProgress();

    document.getElementById('statTodayCorrect').textContent = stats.todayCorrect;
    document.getElementById('statTodayTotal').textContent = stats.todayTotal;
    document.getElementById('statTotalCorrect').textContent = stats.totalCorrect;
    document.getElementById('statTotalQuestions').textContent = stats.totalQuestions;

    const accuracy = stats.totalQuestions > 0
        ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
        : 0;
    document.getElementById('statAccuracy').textContent = accuracy + '%';

    const container = document.getElementById('positionStatsContainer');
    if (!container) return;
    container.innerHTML = '';

    const inst = getInstrumentData(appState.selectedInstrument || 'trombone');

    for (let pos = 1; pos <= 7; pos++) {
        const posStats = stats.positionStats[pos];
        const posAccuracy = posStats.total > 0
            ? Math.round((posStats.correct / posStats.total) * 100)
            : 0;

        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center mb-1';

        let badgeClass = 'bg-secondary';
        if (posAccuracy >= 80) badgeClass = 'bg-success';
        else if (posAccuracy >= 60) badgeClass = 'bg-warning';
        else if (posStats.total > 0) badgeClass = 'bg-danger';

        const label = inst.labels[pos - 1] || pos;
        const prefix = inst.id === 'trumpet' ? "Ventile" : "Position";

        div.innerHTML = `
            <span>${prefix} ${label}:</span>
            <span>
                <span class="badge ${badgeClass}">${posAccuracy}%</span>
                <span class="text-muted ms-1">(${posStats.correct}/${posStats.total})</span>
            </span>
        `;
        container.appendChild(div);
    }
}

export function shareProgressReport() {
    const stats = getCurrentUserProgress();
    const accuracy = stats.totalQuestions > 0
        ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
        : 0;
        
    const date = new Date().toLocaleDateString();
    
    // Instrument Name for sharing
    const inst = getInstrumentData(appState.selectedInstrument || 'trombone');
    
    let text = `🎺 Blechblastrainer (${inst.name}) Bericht (${date})\n\n`;
    text += `⭐ Level: ${stats.level}\n`;
    text += `🔥 Streak: ${userProgress.streak} Tage\n`;
    text += `✨ XP: ${stats.xp}\n\n`;
    text += `📊 Heute:\n`;
    text += `✅ Richtig: ${stats.todayCorrect}/${stats.todayTotal}\n`;
    text += `🎯 Genauigkeit (Gesamt): ${accuracy}%\n\n`;
    text += `Weiter so! 🎶`;

    if (navigator.share) {
        navigator.share({
            title: 'Blechblastrainer Fortschritt',
            text: text
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text).then(() => {
            alert("Bericht in die Zwischenablage kopiert!");
        }).catch(err => {
            alert("Konnte Bericht nicht kopieren: " + err);
        });
    }
}

export function updateInstructionsUI() {
    const inst = getInstrumentData(appState.selectedInstrument || 'trombone');
    const isTrumpet = inst.id === 'trumpet';

    const helpInstName = document.getElementById('helpInstName');
    const helpInstPos = document.getElementById('helpInstPos');
    const helpQuizDesc = document.getElementById('helpQuizDesc');
    const helpExploreDesc = document.getElementById('helpExploreDesc');
    const helpTableTitle = document.getElementById('helpTableTitle');
    const helpControlsList = document.getElementById('helpControlsList');
    const helpLevel1Req = document.getElementById('helpLevel1Req');
    const refTableHeadPos = document.getElementById('refTableHeadPos');
    const helpAutoPlayDesc = document.getElementById('helpAutoPlayDesc');
    const statsPosTitle = document.getElementById('statsPosTitle');

    if (helpInstName) helpInstName.innerText = inst.name;
    if (helpInstPos) helpInstPos.innerText = isTrumpet ? "Griffe (Ventile)" : "Zugpositionen";
    
    if (helpQuizDesc) helpQuizDesc.innerText = isTrumpet 
        ? "Trainiere das Treffen der richtigen Griffe." 
        : "Trainiere das Treffen der richtigen Zugpositionen.";

    if (helpExploreDesc) helpExploreDesc.innerText = isTrumpet
        ? "Drücke die Ventile und sieh, welche Töne dort liegen."
        : "Bewege den Zug und sieh, welche Töne dort liegen.";

    if (helpAutoPlayDesc) helpAutoPlayDesc.innerHTML = isTrumpet
        ? "Nutze <strong>Auto-Play</strong>, um den Grundton beim Drücken zu hören."
        : "Nutze <strong>Auto-Play</strong>, um den Grundton beim Ziehen zu hören.";

    if (helpTableTitle) helpTableTitle.innerText = isTrumpet 
        ? "Grifftabelle & Ventile" 
        : "Zugtabelle & Positionen";

    if (refTableHeadPos) refTableHeadPos.innerText = isTrumpet ? "Ventile" : "Pos";

    if (statsPosTitle) statsPosTitle.innerText = isTrumpet ? "Genauigkeit pro Griff" : "Genauigkeit pro Position";

    if (helpLevel1Req) {
        helpLevel1Req.innerHTML = isTrumpet
            ? `<strong>Level 1 (Anfänger):</strong> Du musst <strong>20x</strong> im Quiz die richtigen Griffe treffen und <strong>10x</strong> eine Theorie-Frage richtig beantworten, um aufzusteigen.`
            : `<strong>Level 1 (Anfänger):</strong> Du musst <strong>20x</strong> im Quiz die richtige Position treffen und <strong>10x</strong> eine Theorie-Frage richtig beantworten, um aufzusteigen.`;
    }

    if (helpControlsList) {
        if (isTrumpet) {
            helpControlsList.innerHTML = `
                <li><strong>PC / Tablet:</strong> Klicke auf die Ventile im Bild.</li>
                <li><strong>Smartphone:</strong> Tippe direkt auf die Ventile.</li>
            `;
        } else {
            helpControlsList.innerHTML = `
                <li><strong>PC / Tablet:</strong> Ziehe den Slider am Griff oder klicke direkt auf die Zahlen im Bild.</li>
                <li><strong>Smartphone:</strong> Nutze die großen runden Buttons (1-7) unter der Grafik.</li>
            `;
        }
    }
}
