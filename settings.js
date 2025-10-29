document.addEventListener('DOMContentLoaded', function() {
    const defaultTone = document.getElementById('defaultTone');
    const defaultLanguage = document.getElementById('defaultLanguage');
    const autoCopy = document.getElementById('autoCopy');
    const saveHistory = document.getElementById('saveHistory');
    const maxHistoryItems = document.getElementById('maxHistoryItems');
    const enableAIFallback = document.getElementById('enableAIFallback');
    const showTimestamps = document.getElementById('showTimestamps');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const status = document.getElementById('status');

    loadSettings();

    saveBtn.addEventListener('click', saveSettings);

    resetBtn.addEventListener('click', resetSettings);

    async function loadSettings() {
        try {
            const settings = await chrome.storage.sync.get({
                defaultTone: 'professional',
                defaultLanguage: 'en',
                autoCopy: false,
                saveHistory: true,
                maxHistoryItems: 50,
                enableAIFallback: true,
                showTimestamps: true
            });

            defaultTone.value = settings.defaultTone;
            defaultLanguage.value = settings.defaultLanguage;
            autoCopy.checked = settings.autoCopy;
            saveHistory.checked = settings.saveHistory;
            maxHistoryItems.value = settings.maxHistoryItems;
            enableAIFallback.checked = settings.enableAIFallback;
            showTimestamps.checked = settings.showTimestamps;

            updateStatus('Settings loaded', 'success');
            setTimeout(() => updateStatus(''), 2000);
        } catch (error) {
            console.error('Error loading settings:', error);
            updateStatus('Error loading settings', 'error');
        }
    }

    async function saveSettings() {
        try {
            const settings = {
                defaultTone: defaultTone.value,
                defaultLanguage: defaultLanguage.value,
                autoCopy: autoCopy.checked,
                saveHistory: saveHistory.checked,
                maxHistoryItems: parseInt(maxHistoryItems.value),
                enableAIFallback: enableAIFallback.checked,
                showTimestamps: showTimestamps.checked
            };

            await chrome.storage.sync.set(settings);
            updateStatus('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            updateStatus('Error saving settings', 'error');
        }
    }

    async function resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            await chrome.storage.sync.clear();
            await loadSettings();
            updateStatus('Settings reset to defaults', 'success');
        }
    }

    function updateStatus(message, type = '') {
        status.textContent = message;
        status.className = `status ${type}`;
    }
});