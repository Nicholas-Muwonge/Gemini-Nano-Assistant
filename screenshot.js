(function() {
    if (window.hasScreenshotOverlay) return;
    window.hasScreenshotOverlay = true;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.7);
        z-index: 10000;
        cursor: crosshair;
    `;

    const selection = document.createElement('div');
    selection.style.cssText = `
        position: fixed;
        border: 2px solid #1a73e8;
        background: rgba(26, 115, 232, 0.1);
        z-index: 10001;
        pointer-events: none;
    `;

    const info = document.createElement('div');
    info.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a73e8;
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        z-index: 10002;
        font-family: Arial, sans-serif;
        font-size: 14px;
    `;
    info.textContent = 'Select area to capture (ESC to cancel)';

    let startX, startY, currentX, currentY;
    let isSelecting = false;

    function startSelection(e) {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        selection.style.left = startX + 'px';
        selection.style.top = startY + 'px';
        selection.style.width = '0px';
        selection.style.height = '0px';
    }

    function updateSelection(e) {
        if (!isSelecting) return;
        
        currentX = e.clientX;
        currentY = e.clientY;
        
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        
        selection.style.left = left + 'px';
        selection.style.top = top + 'px';
        selection.style.width = width + 'px';
        selection.style.height = height + 'px';
    }

    async function finishSelection() {
        if (!isSelecting) return;
        isSelecting = false;
        
        const rect = selection.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
            cleanup();
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            ctx.drawWindow(window, rect.left, rect.top, rect.width, rect.height, 'white');
            
            const dataUrl = canvas.toDataURL('image/png');
            
            chrome.runtime.sendMessage({
                action: 'screenshotCaptured',
                dataUrl: dataUrl,
                coordinates: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                }
            });
            
        } catch (error) {
            console.error('Screenshot error:', error);
        }
        
        cleanup();
    }

    function cleanup() {
        document.body.removeChild(overlay);
        document.body.removeChild(selection);
        document.body.removeChild(info);
        window.hasScreenshotOverlay = false;
        
        document.removeEventListener('mousedown', startSelection);
        document.removeEventListener('mousemove', updateSelection);
        document.removeEventListener('mouseup', finishSelection);
        document.removeEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }

    document.body.appendChild(overlay);
    document.body.appendChild(selection);
    document.body.appendChild(info);

    overlay.addEventListener('mousedown', startSelection);
    document.addEventListener('mousemove', updateSelection);
    document.addEventListener('mouseup', finishSelection);
    document.addEventListener('keydown', handleKeydown);
})();