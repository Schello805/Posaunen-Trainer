# 🎺 Blechblastrainer (Brass Trainer) v2.2

Ein interaktiver Web-Trainer für **Posaune und Trompete**, um Zugpositionen, Griffe, Notenlesen und Intonation zu üben.

![Blechblastrainer Screenshot](screenshot.png)
*(Füge hier später einen Screenshot ein)*

## ✨ Features (v2.2)

### 🎷 Multi-Instrument Support
*   **Posaune:** Trainiere die 7 Zugpositionen im Bassschlüssel.
*   **Trompete:** Trainiere die 7 Griffkombinationen (Ventile) im Violinschlüssel (transponierend in B).
*   **Getrennter Fortschritt:** Level, XP und Tagesziele werden für jedes Instrument separat gespeichert.

### 🎮 Quiz Modus
*   **Noten lernen:** Dir wird eine Note angezeigt, und du musst die korrekte Position/den Griff auf dem virtuellen Instrument finden.
*   **Gamification:** Sammle XP, steige Level auf und halte deine "Daily Streak" (Tage in Folge).
    *   **Level 1 (Anfänger):** Einfache Tonleiter (B-Dur).
        *   *Aufstieg:* Du musst **20x** im Quiz und **10x** in der Theorie richtig liegen, um Level 2 freizuschalten.
    *   **Level 2 (Fortgeschritten):** Erweiterter Tonumfang.
    *   **Level 3 (Profi):** Chromatisch über alle Lagen.
*   **Spaced Repetition:** Die App merkt sich, welche Töne dir schwerfallen, und fragt diese öfter ab.

### 🎤 Stimmgerät & Mikrofon-Modus (Beta)
*   **Echtes Instrument:** Aktiviere das Mikrofon und spiele echte Töne in die App.
*   **KI-Erkennung:** Dank `ml5.js` erkennt die App den gespielten Ton (auch transponierte Trompetentöne) und prüft, ob du richtig liegst.
*   **Intonations-Trainer:** Ein visuelles Stimmgerät zeigt dir, ob du zu hoch oder zu tief bist.

### 🎨 Modernes Design & Audio
*   **Neues UI:** Frisches Design mit "Glassmorphism"-Effekten und warmen Messing-Farben im hellen Modus.
*   **Dark Mode:** Augenschonender Dunkelmodus für das Üben am Abend.
*   **Audio Engine:** Realistische, synthetisierte Klänge, angepasst für den Charakter von Posaune (weich) und Trompete (strahlend).

### 📚 Erkunden & Referenz
*   **Interaktive Grifftabelle:** Wähle eine Position/Ventile und sieh alle spielbaren Töne.
*   **Fachwissen:** Ein Theorie-Quiz testet dein Wissen rund um dein Instrument.

## 🛠 Technologien

Dieses Projekt wurde mit reinem **Vanilla Web Technologies** gebaut, ohne schwere Frameworks:

*   **HTML5 & CSS3:** Modernes, responsives Design (Bootstrap 5).
*   **JavaScript (ES6+):** Komplette Logik für Quiz, Audio und Gamification.
*   **VexFlow:** Rendering der Musiknoten im Browser.
*   **Web Audio API:** Synthese der Instrumentenklänge.
*   **ml5.js (Crepe Model):** KI-basierte Tonhöhenerkennung.
*   **Canvas Confetti:** Für die Belohnungseffekte.

## 🚀 Installation & Nutzung

Da es sich um eine statische Web-App (PWA) handelt, ist keine Installation notwendig.

1.  Lade den Ordner herunter.
2.  Öffne die Datei `index.html` in einem modernen Browser (Chrome, Firefox, Safari, Edge).
3.  **Für Mikrofon-Support:** Manche Browser erfordern, dass die Seite über einen Server (localhost oder HTTPS) geladen wird, damit das Mikrofon funktioniert.
    *   *Tipp:* Nutze die VS Code Extension "Live Server" oder `python3 -m http.server`.

## 📱 Mobile Support
Die App ist vollständig "Mobile First" optimiert und funktioniert hervorragend auf Smartphones und Tablets.

## 📄 Lizenz
Dieses Projekt ist unter der MIT Lizenz veröffentlicht - siehe [LICENSE](LICENSE) Datei.

---
*Entwickelt mit ❤️ für Blechbläser.*
