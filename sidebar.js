class GeminiSidebar {
    constructor() {
        this.currentMode = 'text';
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.usageStats = { today: 0, total: 0 };
        
        this.init();
    }

    async init() {
        await this.loadUsageStats();
        this.setupEventListeners();
        this.setupModeSwitching();
        this.setupImageProcessing();
        this.setupVoiceProcessing();
        this.setupDocumentProcessing();
        this.loadSelectedText();
        this.checkPendingActions();
        
        this.updateStatus('Ready to assist');
    }

    setupEventListeners() {
        // Close panel
        document.getElementById('closePanel').addEventListener('click', () => {
            window.close();
        });

        // Text actions
        document.getElementById('pasteText').addEventListener('click', () => this.pasteText());
        document.getElementById('clearText').addEventListener('click', () => this.clearText());

        // Action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.processText(action);
            });
        });

        // Output actions
        document.getElementById('copyOutput').addEventListener('click', () => this.copyOutput());
        document.getElementById('saveOutput').addEventListener('click', () => this.saveOutput());
        document.getElementById('speakOutput').addEventListener('click', () => this.speakOutput());

        // Footer buttons
        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
    }

    setupModeSwitching() {
        const modeTabs = document.querySelectorAll('.mode-tab');
        const inputModes = document.querySelectorAll('.input-mode');

        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                
                // Update active tab
                modeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active mode
                inputModes.forEach(m => m.classList.add('hidden'));
                document.getElementById(`${mode}-mode`).classList.remove('hidden');
                
                this.currentMode = mode;
                this.updateStatus(`Ready for ${mode} input`);

                // Show/hide speak button
                const speakBtn = document.getElementById('speakOutput');
                speakBtn.classList.toggle('hidden', mode !== 'text');
            });
        });
    }

    setupImageProcessing() {
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('imageInput');
        const imagePreview = document.getElementById('imagePreview');
        const removeImage = document.getElementById('removeImage');
        const captureVisible = document.getElementById('captureVisible');
        const captureArea = document.getElementById('captureArea');

        imageUploadArea.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));

        // Drag and drop
        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = 'var(--primary)';
            imageUploadArea.style.background = 'var(--primary-light)';
        });

        imageUploadArea.addEventListener('dragleave', () => {
            imageUploadArea.style.borderColor = 'var(--border)';
            imageUploadArea.style.background = 'var(--bg-secondary)';
        });

        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = 'var(--border)';
            imageUploadArea.style.background = 'var(--bg-secondary)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.handleImageFile(files[0]);
            }
        });

        removeImage.addEventListener('click', () => {
            imagePreview.classList.add('hidden');
            imageUploadArea.classList.remove('hidden');
            imageInput.value = '';
        });

        captureVisible.addEventListener('click', () => this.captureVisibleTab());
        captureArea.addEventListener('click', () => this.captureScreenArea());
    }

    setupVoiceProcessing() {
        const startRecording = document.getElementById('startRecording');
        const stopRecording = document.getElementById('stopRecording');

        startRecording.addEventListener('click', () => this.startVoiceRecording());
        stopRecording.addEventListener('click', () => this.stopVoiceRecording());
    }

    setupDocumentProcessing() {
        const documentUploadArea = document.getElementById('documentUploadArea');
        const documentInput = document.getElementById('documentInput');
        const processDocument = document.getElementById('processDocument');

        documentUploadArea.addEventListener('click', () => documentInput.click());
        documentInput.addEventListener('change', (e) => this.handleDocumentUpload(e));
        processDocument.addEventListener('click', () => this.processUploadedDocument());
    }

    // ... (Include all the methods from previous implementation, adapted for sidebar)
    // Methods like handleImageUpload, startVoiceRecording, processText, etc.
    // These would be similar to previous implementation but adapted for the new UI

    updateStatus(message, type = '') {
        const status = document.getElementById('status');
        status.textContent = message;
        
        // Remove existing classes
        status.className = 'footer-status';
        
        if (type) {
            status.classList.add(type);
        }
    }

    async loadUsageStats() {
        try {
            const result = await chrome.storage.local.get(['usageStats']);
            if (result.usageStats) {
                this.usageStats = result.usageStats;
            }
            
            // Update UI
            document.getElementById('todayCount').textContent = this.usageStats.today;
            document.getElementById('totalCount').textContent = this.usageStats.total;
        } catch (error) {
            console.error('Error loading usage stats:', error);
        }
    }

    async incrementUsage() {
        this.usageStats.today++;
        this.usageStats.total++;
        
        document.getElementById('todayCount').textContent = this.usageStats.today;
        document.getElementById('totalCount').textContent = this.usageStats.total;
        
        await chrome.storage.local.set({ usageStats: this.usageStats });
    }

    showHistory() {
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    }

    showSettings() {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    }

    // ... (Include all other methods from previous implementation)
}

document.addEventListener('DOMContentLoaded', () => {
    new GeminiSidebar();
});