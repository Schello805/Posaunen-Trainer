
// --- VEXFLOW RENDERER HELPER ---

// Helper to get Vex Flow objects safely inside functions
function getVex() {
    if (typeof Vex === 'undefined' || !Vex.Flow) {
        console.error("VexFlow not loaded!");
        throw new Error("VexFlow is not loaded. Check internet connection or script order.");
    }
    return Vex.Flow;
}

export function renderVexFlowNotes(id, keys, isFallback = false, clef = "bass") {
    console.log("Score Renderer v10 loaded");
    const div = document.getElementById(id); if (!div) return; div.innerHTML = "";
    if (isFallback) div.classList.add('grayscale-staff'); else div.classList.remove('grayscale-staff');

    const { Renderer, Stave, StaveNote, Accidental, Formatter, Voice } = getVex();

    const r = new Renderer(div, Renderer.Backends.SVG);
    // Larger canvas to prevent cutoff
    r.resize(400, 200);
    const ctx = r.getContext();
    // High internal zoom
    const zoom = 2.2;
    ctx.scale(zoom, zoom);

    // Dynamic Centering
    // Canvas 400 / 2.2 = ~181 width.
    // Stave 150 wide matches rendering space
    const staveWidth = 150;
    const effectiveWidth = 400 / zoom;
    const staveX = (effectiveWidth - staveWidth) / 2;

    // Vertical centering
    // High vertical offset
    const staveY = -25;

    const s = new Stave(staveX, staveY, staveWidth);
    s.addClef(clef);
    s.setContext(ctx).draw();

    const n = new StaveNote({ keys: keys, duration: "w", clef: clef, align_center: true });
    if (isFallback) n.setStyle({ fillStyle: "#999", strokeStyle: "#999" });

    keys.forEach((k, i) => {
        const notePart = k.split('/')[0].trim();
        const acc = notePart.substring(1);

        if (acc === 'b') addModifierToNote(n, new Accidental('b'), i);
        if (acc === 'bb') addModifierToNote(n, new Accidental('bb'), i);
        if (acc === '#') addModifierToNote(n, new Accidental('#'), i);
    });

    const v = new Voice({ num_beats: 4, beat_value: 4 });
    v.addTickables([n]);
    // Format to smaller width than stave to pull note left (closer to center)
    new Formatter().joinVoices([v]).format([v], 110);
    v.draw(ctx, s);

    // Ensure SVG fills container via JS as backup to CSS
    const svg = div.querySelector('svg');
    if (svg) {
        svg.style.width = "100%";
        svg.style.height = "100%";
    }

    console.log(`Rendered keys: ${keys} on ${id}`);
}

export function renderEmptyStave(id, clef = "bass") {
    const div = document.getElementById(id); if (!div) return; div.innerHTML = "";

    const { Renderer, Stave } = getVex();

    const r = new Renderer(div, Renderer.Backends.SVG);
    r.resize(400, 200);
    const ctx = r.getContext();
    const zoom = 2.2;
    ctx.scale(zoom, zoom);

    // Dynamic Centering
    const staveWidth = 150;
    const effectiveWidth = 400 / zoom;
    const staveX = (effectiveWidth - staveWidth) / 2;
    const staveY = -25;

    const s = new Stave(staveX, staveY, staveWidth);
    s.addClef(clef);
    s.setContext(ctx).draw();

    // Ensure SVG fills container via JS as backup to CSS
    const svg = div.querySelector('svg');
    if (svg) {
        svg.style.width = "100%";
        svg.style.height = "100%";
    }
}

export function renderNoteThumbnail(container, noteKey, clef = "bass") {
    const div = document.createElement('div');
    div.className = 'mini-staff';
    container.appendChild(div);

    const { Renderer, Stave, StaveNote, Accidental, Formatter, Voice } = getVex();

    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(80, 60);
    const ctx = renderer.getContext();
    ctx.scale(0.6, 0.6);
    const stave = new Stave(0, 0, 130);
    // No clef on thumbnail usually to save space, but if we change instruments, maybe we should show it?
    // Actually VexFlow StaveNote needs to know the clef for positioning even if we don't draw the clef symbol on the stave.
    // Let's draw the lines.
    stave.setContext(ctx).draw();
    
    const note = new StaveNote({ keys: [noteKey], duration: "w", clef: clef, align_center: true });

    if (noteKey.includes('bb')) addModifierToNote(note, new Accidental('bb'), 0);
    else if (noteKey.includes('b')) addModifierToNote(note, new Accidental('b'), 0);
    if (noteKey.includes('#')) addModifierToNote(note, new Accidental('#'), 0);

    const voice = new Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables([note]);
    new Formatter().joinVoices([voice]).format([voice], 100);
    voice.draw(ctx, stave);
}

export function addModifierToNote(note, modifier, index) {
    // Explicitly use VexFlow 4.x signature (modifier, index)
    // as we are running with VexFlow 4.2.3
    note.addModifier(modifier, index);
}
