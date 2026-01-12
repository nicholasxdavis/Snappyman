const { ipcRenderer, desktopCapturer } = require('electron');

const canvas = document.getElementById('selection-canvas');
const ctx = canvas.getContext('2d');
const uiToolbar = document.getElementById('ui-toolbar');
const statusDiv = document.getElementById('status');
const popup = document.getElementById('custom-popup');
const popupText = document.getElementById('popup-text');
const popupBtn = document.getElementById('popup-ok');

// Buttons
const btnToggle = document.getElementById('btn-toggle');
const btnLock = document.getElementById('btn-lock');

// STATE
let appState = 'PASSIVE'; // PASSIVE | ACTIVE | LOCKED
let popupActive = false;  // NEW: Blocks mouse leave logic
let selectionRect = { x: 0, y: 0, w: 0, h: 0 };
let dragAction = null; 
let dragStart = { x: 0, y: 0 };
let rectStart = { x: 0, y: 0, w: 0, h: 0 };

const HANDLE_SIZE = 8;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}
window.addEventListener('resize', resize);
resize();

setPassiveMode();

// ---------------------------
// STATE MANAGEMENT
// ---------------------------

function setPassiveMode() {
    appState = 'PASSIVE';
    btnToggle.innerText = "OFF";
    btnToggle.classList.add('btn-off');
    btnLock.style.display = 'none';
    
    document.body.classList.add('passive-mode');
    document.body.classList.remove('locked-mode');
    
    // Opacity: 97%
    uiToolbar.style.opacity = "0.97";
    
    selectionRect = { x:0, y:0, w:0, h:0 };
    
    if (!popupActive) {
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
    }
    
    draw();
}

function setActiveMode() {
    appState = 'ACTIVE';
    btnToggle.innerText = "ON";
    btnToggle.classList.remove('btn-off');
    btnLock.style.display = 'block';
    btnLock.innerText = "LOCK SELECTION";
    btnLock.style.color = "#e0e0e0";
    
    document.body.classList.remove('passive-mode');
    document.body.classList.remove('locked-mode');

    // Opacity: 100%
    uiToolbar.style.opacity = "1.0";
    
    ipcRenderer.send('set-ignore-mouse', false);
    
    draw();
}

function setLockedMode() {
    if (selectionRect.w <= 0 || selectionRect.h <= 0) {
        return showPopup("Draw a selection first!");
    }
    
    appState = 'LOCKED';
    btnLock.innerText = "UNLOCK";
    btnLock.style.color = "#ff6b6b";
    
    document.body.classList.add('locked-mode');
    
    if (!popupActive) {
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
    }
    
    draw();
}

function toggleState() {
    if (appState === 'PASSIVE') setActiveMode();
    else setPassiveMode();
}

function toggleLock() {
    if (appState === 'LOCKED') setActiveMode();
    else setLockedMode();
}

// ---------------------------
// POPUP SYSTEM (Fixed Z-Index/Focus)
// ---------------------------

function showPopup(msg) {
    popupActive = true; // Block mouseleave logic
    popupText.innerText = msg;
    popup.style.display = 'flex';
    document.body.classList.add('popup-active');
    
    // FORCE ENABLE MOUSE
    ipcRenderer.send('set-ignore-mouse', false);
}

popupBtn.onclick = () => {
    popupActive = false; // Unblock logic
    popup.style.display = 'none';
    document.body.classList.remove('popup-active');
    
    // Restore correct mouse state
    if (appState === 'PASSIVE' || appState === 'LOCKED') {
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
    }
};

// ---------------------------
// SCREENSHOT LOGIC (Fixed Undefined Error)
// ---------------------------

async function takeSnapshot() {
    if (selectionRect.w <= 0 || selectionRect.h <= 0) return showPopup("No selection!");

    const flash = document.getElementById('flash');
    flash.style.opacity = 0.5;
    setTimeout(() => flash.style.opacity = 0, 100);

    try {
        // 1. Get Info from Main Process (Fixes "screen undefined" error)
        const displayInfo = await ipcRenderer.invoke('get-scale-factor');
        const scale = displayInfo.scale;
        const bounds = displayInfo.bounds;

        const cropX = Math.round(selectionRect.x * scale);
        const cropY = Math.round(selectionRect.y * scale);
        const cropW = Math.round(selectionRect.w * scale);
        const cropH = Math.round(selectionRect.h * scale);

        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: bounds.width * scale,
                height: bounds.height * scale
            }
        });

        const img = sources[0].thumbnail;
        const cropped = img.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
        const buffer = cropped.toPNG();
        
        const result = await ipcRenderer.invoke('save-snapshot', { buffer });
        
        if (result) {
            statusDiv.style.display = 'block';
            setTimeout(() => statusDiv.style.display = 'none', 1500);
        } else {
            showPopup("Error saving file");
        }
    } catch (e) {
        console.error(e);
        showPopup("Snapshot failed: " + e.message);
    }
}

// ---------------------------
// MOUSE & CANVAS
// ---------------------------

function getHandleRects(r) {
    return {
        tl: { x: r.x - HANDLE_SIZE/2, y: r.y - HANDLE_SIZE/2, w: HANDLE_SIZE, h: HANDLE_SIZE },
        tr: { x: r.x + r.w - HANDLE_SIZE/2, y: r.y - HANDLE_SIZE/2, w: HANDLE_SIZE, h: HANDLE_SIZE },
        bl: { x: r.x - HANDLE_SIZE/2, y: r.y + r.h - HANDLE_SIZE/2, w: HANDLE_SIZE, h: HANDLE_SIZE },
        br: { x: r.x + r.w - HANDLE_SIZE/2, y: r.y + r.h - HANDLE_SIZE/2, w: HANDLE_SIZE, h: HANDLE_SIZE }
    };
}
function pointInRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

canvas.addEventListener('mousedown', (e) => {
    if (appState !== 'ACTIVE') return;
    const mx = e.clientX, my = e.clientY;

    if (selectionRect.w > 0) {
        const h = getHandleRects(selectionRect);
        if (pointInRect(mx, my, h.tl)) { dragAction = 'RESIZE_TL'; dragStart = {x:mx, y:my}; rectStart = {...selectionRect}; return; }
        if (pointInRect(mx, my, h.tr)) { dragAction = 'RESIZE_TR'; dragStart = {x:mx, y:my}; rectStart = {...selectionRect}; return; }
        if (pointInRect(mx, my, h.bl)) { dragAction = 'RESIZE_BL'; dragStart = {x:mx, y:my}; rectStart = {...selectionRect}; return; }
        if (pointInRect(mx, my, h.br)) { dragAction = 'RESIZE_BR'; dragStart = {x:mx, y:my}; rectStart = {...selectionRect}; return; }
    }

    dragAction = 'CREATE';
    selectionRect = { x: mx, y: my, w: 0, h: 0 };
    draw();
});

canvas.addEventListener('mousemove', (e) => {
    if (appState !== 'ACTIVE') return;
    const mx = e.clientX, my = e.clientY;

    if (!dragAction && selectionRect.w > 0) {
        const h = getHandleRects(selectionRect);
        if (pointInRect(mx, my, h.tl) || pointInRect(mx, my, h.br)) canvas.style.cursor = 'nwse-resize';
        else if (pointInRect(mx, my, h.tr) || pointInRect(mx, my, h.bl)) canvas.style.cursor = 'nesw-resize';
        else canvas.style.cursor = 'crosshair';
    }

    if (!dragAction) return;
    
    if (dragAction === 'CREATE') {
        selectionRect.w = mx - selectionRect.x;
        selectionRect.h = my - selectionRect.y;
    } else if (dragAction === 'RESIZE_BR') {
        selectionRect.w = rectStart.w + (mx - dragStart.x);
        selectionRect.h = rectStart.h + (my - dragStart.y);
    } else if (dragAction === 'RESIZE_TL') {
        selectionRect.x = rectStart.x + (mx - dragStart.x);
        selectionRect.y = rectStart.y + (my - dragStart.y);
        selectionRect.w = rectStart.w - (mx - dragStart.x);
        selectionRect.h = rectStart.h - (my - dragStart.y);
    }
    draw();
});

canvas.addEventListener('mouseup', () => {
    if (appState !== 'ACTIVE') return;
    dragAction = null;
    if (selectionRect.w < 0) { selectionRect.x += selectionRect.w; selectionRect.w = Math.abs(selectionRect.w); }
    if (selectionRect.h < 0) { selectionRect.y += selectionRect.h; selectionRect.h = Math.abs(selectionRect.h); }
    draw();
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (appState === 'PASSIVE') return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (selectionRect.w > 0 && selectionRect.h > 0) {
        ctx.clearRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        
        if (appState === 'ACTIVE') {
            ctx.fillStyle = '#639bff';
            const h = getHandleRects(selectionRect);
            ctx.fillRect(h.tl.x, h.tl.y, h.tl.w, h.tl.h);
            ctx.fillRect(h.tr.x, h.tr.y, h.tr.w, h.tr.h);
            ctx.fillRect(h.bl.x, h.bl.y, h.bl.w, h.bl.h);
            ctx.fillRect(h.br.x, h.br.y, h.br.w, h.br.h);
        }

        if (appState !== 'LOCKED') {
            ctx.font = '20px m5x7';
            ctx.fillStyle = '#fff';
            ctx.shadowColor = "#000";
            ctx.shadowBlur = 2;
            ctx.fillText(`${Math.round(selectionRect.w)}x${Math.round(selectionRect.h)}`, selectionRect.x, selectionRect.y - 10);
            ctx.shadowBlur = 0;
        }
    }
}

// ---------------------------
// UI EVENTS
// ---------------------------
btnToggle.onclick = toggleState;
btnLock.onclick = toggleLock;
document.getElementById('btn-snap').onclick = takeSnapshot;
document.getElementById('btn-reset').onclick = () => { setActiveMode(); selectionRect = {x:0, y:0, w:0, h:0}; draw(); };
document.getElementById('btn-quit').onclick = () => window.close();
document.getElementById('btn-folder').onclick = () => ipcRenderer.invoke('open-folder');

uiToolbar.addEventListener('mouseenter', () => {
    // Always enable mouse to click buttons
    ipcRenderer.send('set-ignore-mouse', false);
});

uiToolbar.addEventListener('mouseleave', () => {
    // Only revert to ignore-mouse if POPUP IS NOT ACTIVE
    if (popupActive) return;

    if (appState === 'PASSIVE' || appState === 'LOCKED') {
        ipcRenderer.send('set-ignore-mouse', true, { forward: true });
    }
});

ipcRenderer.on('trigger-snap', takeSnapshot);
ipcRenderer.on('trigger-reset', () => { if(appState === 'LOCKED') toggleLock(); });
