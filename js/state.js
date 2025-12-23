
// --- SHARED STATE ---

const defaultInstrumentStats = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    highScore: 0,
    todayCorrect: 0,
    todayTotal: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    positionStats: {
        1: { correct: 0, total: 0 },
        2: { correct: 0, total: 0 },
        3: { correct: 0, total: 0 },
        4: { correct: 0, total: 0 },
        5: { correct: 0, total: 0 },
        6: { correct: 0, total: 0 },
        7: { correct: 0, total: 0 }
    },
    levelRequirements: {
        quizCorrect: 0,
        theoryCorrect: 0
    },
    noteStats: {} 
};

export const userProgress = {
    streak: 0,
    lastLogin: null,
    instruments: {
        trombone: JSON.parse(JSON.stringify(defaultInstrumentStats)),
        trumpet: JSON.parse(JSON.stringify(defaultInstrumentStats))
    }
};

export const appState = {
    selectedInstrument: 'trombone', // 'trombone' or 'trumpet'
    currentQuizQuestion: null,
    quizActive: true,
    currentSliderSelection: 1,
    lastLearnRenderedNote: null,
    streak: 0, // This seems redundant with userProgress.streak, but checking usage...
    difficultyOverride: 0, // 0 = Auto, 1-3 = Manuell
    micActive: false
};

// Helper to get current instrument stats safely
export function getCurrentUserProgress() {
    const inst = appState.selectedInstrument || 'trombone';
    if (!userProgress.instruments[inst]) {
        userProgress.instruments[inst] = JSON.parse(JSON.stringify(defaultInstrumentStats));
    }
    return userProgress.instruments[inst];
}
