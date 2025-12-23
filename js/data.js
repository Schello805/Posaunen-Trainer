
// --- DATENBASIS ---

export const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Posaune (Bassschlüssel, C-Stimmung / Klingend)
// 1 = Zug drin, 7 = Zug draußen
const trombonePositions = {
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

// Trompete (Violinschlüssel, in B)
// Wir mappen die Ventil-Kombinationen auf "Positionen" 1-7 für interne Konsistenz
// 1 = 0 (Offen)
// 2 = 2
// 3 = 1
// 4 = 12
// 5 = 23
// 6 = 13
// 7 = 123
// Frequenzen sind klingend (Concert Pitch)
// Noten-Text und Key sind notiert (in B) für VexFlow
// B-Trompete: Notiertes C4 = Klingendes Bb3 (233.08 Hz)
const trumpetPositions = {
    1: [ // 0 (Offen)
        { text: "c'", key: "c/4", level: 1, isBeginner: true, freq: 233.08 }, // Klingend Bb3
        { text: "g'", key: "g/4", level: 1, isBeginner: true, freq: 349.23 }, // Klingend F4
        { text: "c''", key: "c/5", level: 1, isBeginner: true, freq: 466.16 }, // Klingend Bb4
        { text: "e''", key: "e/5", level: 2, freq: 587.33 },                   // Klingend D5
        { text: "g''", key: "g/5", level: 3, freq: 698.46 }                    // Klingend F5
    ],
    2: [ // 2
        { text: "h", key: "b/3", level: 1, isBeginner: true, freq: 220.00 }, // Klingend A3
        { text: "fis'", key: "f#/4", level: 1, isBeginner: true, freq: 329.63 }, // Klingend E4
        { text: "h'", key: "b/4", level: 1, isBeginner: true, freq: 440.00 }, // Klingend A4
        { text: "dis''", key: "d#/5", level: 2, freq: 554.37 }
    ],
    3: [ // 1
        { text: "b", key: "bb/3", level: 1, isBeginner: true, freq: 207.65 }, // Klingend Ab3
        { text: "f'", key: "f/4", level: 1, isBeginner: true, freq: 311.13 }, // Klingend Eb4
        { text: "b'", key: "bb/4", level: 1, isBeginner: true, freq: 415.30 }, // Klingend Ab4
        { text: "d''", key: "d/5", level: 2, freq: 523.25 }
    ],
    4: [ // 12
        { text: "a", key: "a/3", level: 1, isBeginner: true, freq: 196.00 }, // Klingend G3
        { text: "e'", key: "e/4", level: 1, isBeginner: true, freq: 293.66 }, // Klingend D4
        { text: "a'", key: "a/4", level: 1, isBeginner: true, freq: 392.00 }, // Klingend G4
        { text: "cis''", key: "c#/5", level: 3, freq: 493.88 }
    ],
    5: [ // 23
        { text: "as", key: "ab/3", level: 2, freq: 185.00 }, // Klingend Gb3
        { text: "es'", key: "eb/4", level: 1, isBeginner: true, freq: 277.18 }, // Klingend Db4
        { text: "as'", key: "ab/4", level: 2, freq: 369.99 }
    ],
    6: [ // 13
        { text: "g", key: "g/3", level: 2, freq: 174.61 }, // Klingend F3
        { text: "d'", key: "d/4", level: 1, isBeginner: true, freq: 261.63 }, // Klingend C4
        { text: "g'", key: "g/4", level: 2, freq: 349.23 }
    ],
    7: [ // 123
        { text: "fis", key: "f#/3", level: 2, freq: 164.81 }, // Klingend E3
        { text: "cis'", key: "c#/4", level: 2, freq: 246.94 }, // Klingend B3
        { text: "fis'", key: "f#/4", level: 2, freq: 329.63 }
    ]
};

// Fragen Pools
const tromboneQuestions = [
    // LEICHT (Level 1) - Basics & Aufbau
    { q: "Wie viele Zugpositionen hat eine Posaune?", options: ["7", "5", "3"], correct: 0, level: 1 },
    { q: "Was ist der tiefste Ton in der 1. Position (ohne Quartventil)?", options: ["B (Bb)", "F", "C"], correct: 0, level: 1 },
    { q: "In welchem Schlüssel liest man Posaune meistens?", options: ["Bassschlüssel", "Violinschlüssel", "Altschlüssel"], correct: 0, level: 1 },
    { q: "Wie verändert sich der Ton, wenn man den Zug rauszieht?", options: ["Er wird tiefer", "Er wird höher", "Er bleibt gleich"], correct: 0, level: 1 },
    { q: "Welches Teil vibriert primär, um den Ton zu erzeugen?", options: ["Die Lippen", "Der Zug", "Der Schallbecher"], correct: 0, level: 1 },
    { q: "Was macht die Wasserklappe?", options: ["Kondenswasser ablassen", "Luft reinlassen", "Den Ton verändern"], correct: 0, level: 1 },
    { q: "Wie nennt man das Mundstück der Posaune üblicherweise?", options: ["Kesselmundstück", "Trichtermundstück", "Schnabel"], correct: 0, level: 1 },
    { q: "Welche Hand bewegt den Zug?", options: ["Die Rechte", "Die Linke", "Beide"], correct: 0, level: 1 },
    { q: "Wo ist die 1. Position?", options: ["Zug ganz drin", "Zug ganz draußen", "In der Mitte"], correct: 0, level: 1 },
    { q: "Aus welchem Material besteht eine Posaune meistens?", options: ["Messing", "Holz", "Aluminium"], correct: 0, level: 1 },
    
    // MITTEL (Level 2)
    { q: "Welcher Ton liegt auf der 1. Position (neben dem tiefen B)?", options: ["F", "G", "A"], correct: 0, level: 2 },
    { q: "Auf welcher Position liegt das kleine c?", options: ["3. Position", "1. Position", "6. Position"], correct: 0, level: 2 },
    { q: "Welches Intervall ist zwischen 1. und 2. Position?", options: ["Ein Halbton", "Ein Ganzton", "Eine Terz"], correct: 0, level: 2 },
    
    // SCHWER (Level 3)
    { q: "Was bewirkt das Quartventil?", options: ["Erweitert Tonumfang nach unten", "Macht Töne höher", "Dämpft den Ton"], correct: 0, level: 3 },
    { q: "In welcher Stimmung ist eine Standard-Tenorposaune?", options: ["B (Bb)", "C", "Es"], correct: 0, level: 3 }
];

const trumpetQuestions = [
    // LEICHT (Level 1)
    { q: "Wie viele Ventile hat eine Standard-Trompete?", options: ["3", "4", "2"], correct: 0, level: 1 },
    { q: "In welcher Stimmung ist die Standard-Trompete?", options: ["B (Bb)", "C", "Es"], correct: 0, level: 1 },
    { q: "Welches Ventil drückt man für den Ton H (H1)?", options: ["2 (Mitte)", "1 (Zeigefinger)", "0 (Keins)"], correct: 0, level: 1 },
    { q: "In welchem Schlüssel liest man Trompete?", options: ["Violinschlüssel", "Bassschlüssel", "Altschlüssel"], correct: 0, level: 1 },
    { q: "Wie nennt man das Mundstück der Trompete?", options: ["Kesselmundstück", "Trichtermundstück", "Schnabel"], correct: 0, level: 1 },
    { q: "Welche Hand drückt die Ventile?", options: ["Die Rechte", "Die Linke", "Beide"], correct: 0, level: 1 },
    
    // MITTEL (Level 2)
    { q: "Welches ist das 3. Naturton (Grundton C)?", options: ["G", "C", "E"], correct: 0, level: 2 },
    { q: "Welche Ventilkombination entspricht der 2. Zugposition?", options: ["2. Ventil", "1. Ventil", "1. + 2. Ventil"], correct: 0, level: 2 },
    
    // SCHWER (Level 3)
    { q: "Was macht der Trigger am 3. Ventilzug?", options: ["Gleicht die Intonation aus (d' / cis')", "Macht den Ton höher", "Ist nur Deko"], correct: 0, level: 3 },
    { q: "Welcher Dämpfer erzeugt den 'Miles Davis' Sound?", options: ["Harmon Mute", "Cup Mute", "Straight Mute"], correct: 0, level: 3 }
];


const instruments = {
    trombone: {
        id: 'trombone',
        name: "Posaune",
        clef: "bass",
        positions: trombonePositions,
        questions: tromboneQuestions,
        labels: ["1", "2", "3", "4", "5", "6", "7"]
    },
    trumpet: {
        id: 'trumpet',
        name: "Trompete",
        clef: "treble",
        positions: trumpetPositions,
        questions: trumpetQuestions,
        labels: ["0", "2", "1", "12", "23", "13", "123"] // Mapping for UI Buttons? Or Slider labels?
    }
};

// --- API Helpers ---

// Legacy Support (falls noch direkter Zugriff nötig)
export const positionMap = trombonePositions; 
export const theoryQuestionsPool = tromboneQuestions;

export function getInstrumentData(instId) {
    return instruments[instId] || instruments['trombone'];
}
