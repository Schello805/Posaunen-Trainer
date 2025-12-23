
import { userProgress, getCurrentUserProgress } from './state.js';
import { updateUIStats } from './ui.js';

// --- GAMIFICATION LOGIC ---

export function initGamification() {
    const saved = localStorage.getItem('posauneProgress');
    if (saved) {
        const loaded = JSON.parse(saved);
        
        // MIGRATION LOGIC: Check if we have the new structure
        if (!loaded.instruments) {
            console.log("Migrating legacy data to instrument structure...");
            // Move legacy root stats to trombone
            userProgress.instruments.trombone = {
                level: loaded.level || 1,
                xp: loaded.xp || 0,
                xpToNext: loaded.xpToNext || 100,
                highScore: loaded.highScore || 0,
                todayCorrect: loaded.todayCorrect || 0,
                todayTotal: loaded.todayTotal || 0,
                totalCorrect: loaded.totalCorrect || 0,
                totalQuestions: loaded.totalQuestions || 0,
                positionStats: loaded.positionStats || {
                    1: { correct: 0, total: 0 },
                    2: { correct: 0, total: 0 },
                    3: { correct: 0, total: 0 },
                    4: { correct: 0, total: 0 },
                    5: { correct: 0, total: 0 },
                    6: { correct: 0, total: 0 },
                    7: { correct: 0, total: 0 }
                },
                levelRequirements: loaded.levelRequirements || { quizCorrect: 0, theoryCorrect: 0 },
                noteStats: loaded.noteStats || {}
            };
            // Preserve global stats
            userProgress.streak = loaded.streak || 0;
            userProgress.lastLogin = loaded.lastLogin || null;
        } else {
            // Already migrated, just merge
            Object.assign(userProgress, loaded);
        }
    } else {
        // Legacy Highscore Check
        const oldHigh = localStorage.getItem('posauneHighScore');
        if (oldHigh) userProgress.instruments.trombone.highScore = parseInt(oldHigh);
    }

    checkDailyStreak();
    updateUIStats();
}

export function saveProgress() {
    localStorage.setItem('posauneProgress', JSON.stringify(userProgress));
    updateUIStats();
}

export function checkDailyStreak() {
    const today = new Date().toDateString();
    
    // Global Streak Logic
    if (userProgress.lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (userProgress.lastLogin === yesterday.toDateString()) {
            userProgress.streak++;
        } else if (userProgress.lastLogin !== today) {
            // If lastLogin is null (first run), start streak at 1.
            // If broken streak, reset to 1.
            userProgress.streak = 1;
        }

        // Reset daily stats for ALL instruments
        Object.values(userProgress.instruments).forEach(instStats => {
            instStats.todayCorrect = 0;
            instStats.todayTotal = 0;
        });

        userProgress.lastLogin = today;
        saveProgress();
    }
}

export function addXP(amount) {
    const stats = getCurrentUserProgress();
    stats.xp += amount;
    
    if (stats.xp >= stats.xpToNext) {
        levelUp();
    }
    saveProgress();
}

function levelUp() {
    const stats = getCurrentUserProgress();
    
    // Check Requirements for Level 1 -> 2
    if (stats.level === 1) {
        const reqQuiz = 20;
        const reqTheory = 10;

        if (stats.levelRequirements.quizCorrect < reqQuiz || stats.levelRequirements.theoryCorrect < reqTheory) {
            // Requirements not met yet. Cap XP at max-1.
            if (stats.xp >= stats.xpToNext) {
                stats.xp = stats.xpToNext - 1;
            }
            saveProgress();
            return;
        }
    }

    stats.level++;
    stats.xp -= stats.xpToNext;
    stats.xpToNext = Math.floor(stats.xpToNext * 1.5);

    // Reset requirements for next level
    stats.levelRequirements = { quizCorrect: 0, theoryCorrect: 0 };

    // Visual Feedback
    alert(`🎉 LEVEL UP! Du bist jetzt Level ${stats.level}! Neue Töne freigeschaltet.`);
    if (window.confetti) window.confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });

    saveProgress();
}
