class SettingsManager {
    constructor() {
        this.currentSection = 'general';
        this.settings = {
            defaultTone: 'professional',
            defaultLanguage: 'en',
            sidebarPosition: 'right',
            autoCopy: false,
            saveHistory: true,
            maxHistoryItems: 50,
            showAnimations: true,
            enableAIFallback: true,
            showTimestamps: true,
            autoProcess: true,
            processingTimeout: 30,
            enableAnalytics: false
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupNavigation();
        this.updateQuickSettings();
        this.updateToggleLabels();
    }

    async loadSettings() {
        try {
            const savedSettings = await chrome.storage.sync.get(this.settings);
            this.settings = { ...this.settings, ...savedSettings };
            this.applySettingsToUI();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Error loading settings', 'error');
        }
    }

    applySettingsToUI() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else if (element.type === 'number') {
                    element.value = this.settings[key];
                } else {
                    element.value = this.settings[key];
                }
            }
        });
        
        this.updateQuickSettings();
        this.updateToggleLabels();
    }

    setupEventListeners() {
        document.getElementById('saveBtn').addEventListener('click', () => this.saveSettings());
        
        document.getElementById('resetBtn').addEventListener('click', () => this.resetSettings());
        
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());
        
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportAllData());
        
        document.querySelectorAll('.quick-setting-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const setting = e.currentTarget.dataset.setting;
                this.navigateToSection(this.getSectionForSetting(setting));
            });
        });
        
        document.querySelectorAll('.toggle-input').forEach(toggle => {
            toggle.addEventListener('change', () => this.updateToggleLabel(toggle));
        });
        
        document.getElementById('defaultTone').addEventListener('change', () => this.updateQuickSettings());
        document.getElementById('defaultLanguage').addEventListener('change', () => this.updateQuickSettings());
        document.getElementById('autoCopy').addEventListener('change', () => this.updateQuickSettings());
        document.getElementById('saveHistory').addEventListener('change', () => this.updateQuickSettings());
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.settings-section');
        
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.navigateToSection(section);
            });
        });
    }

    navigateToSection(section) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });
        
        document.querySelectorAll('.settings-section').forEach(sec => {
            sec.style.display = sec.id === `${section}-section` ? 'block' : 'none';
        });
        
        this.currentSection = section;
    }

    getSectionForSetting(setting) {
        const settingSections = {
            defaultTone: 'general',
            defaultLanguage: 'general',
            autoCopy: 'behavior',
            saveHistory: 'behavior'
        };
        
        return settingSections[setting] || 'general';
    }

    updateQuickSettings() {
        const toneSelect = document.getElementById('defaultTone');
        const languageSelect = document.getElementById('defaultLanguage');
        const autoCopyToggle = document.getElementById('autoCopy');
        const saveHistoryToggle = document.getElementById('saveHistory');
        
        if (toneSelect) {
            const toneText = toneSelect.options[toneSelect.selectedIndex].text;
            document.getElementById('currentTone').textContent = toneText;
        }
        
        if (languageSelect) {
            const languageText = languageSelect.options[languageSelect.selectedIndex].text;
            document.getElementById('currentLanguage').textContent = languageText;
        }
        
        if (autoCopyToggle) {
            document.getElementById('currentAutoCopy').textContent = 
                autoCopyToggle.checked ? 'Enabled' : 'Disabled';
        }
        
        if (saveHistoryToggle) {
            document.getElementById('currentHistory').textContent = 
                saveHistoryToggle.checked ? 'Enabled' : 'Disabled';
        }
    }

    updateToggleLabels() {
        document.querySelectorAll('.toggle-input').forEach(toggle => {
            this.updateToggleLabel(toggle);
        });
    }

    updateToggleLabel(toggle) {
        const label = toggle.nextElementSibling.nextElementSibling;
        if (label) {
            label.textContent = toggle.checked ? 'Enabled' : 'Disabled';
        }
    }

    async saveSettings() {
        try {
            const newSettings = {};
            
            document.querySelectorAll('select, input[type="number"], input[type="checkbox"]').forEach(element => {
                if (element.type === 'checkbox') {
                    newSettings[element.id] = element.checked;
                } else if (element.type === 'number') {
                    newSettings[element.id] = parseInt(element.value);
                } else {
                    newSettings[element.id] = element.value;
                }
            });
            
            if (newSettings.maxHistoryItems < 10 || newSettings.maxHistoryItems > 500) {
                this.showStatus('History items must be between 10 and 500', 'error');
                return;
            }
            
            if (newSettings.processingTimeout < 5 || newSettings.processingTimeout > 60) {
                this.showStatus('Processing timeout must be between 5 and 60 seconds', 'error');
                return;
            }
            
            await chrome.storage.sync.set(newSettings);
            this.settings = { ...this.settings, ...newSettings };
            
            this.showStatus('Settings saved successfully!', 'success');
            this.updateQuickSettings();
            
            chrome.runtime.sendMessage({ action: 'settingsUpdated', settings: newSettings });
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Error saving settings', 'error');
        }
    }

    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to their default values?')) {
            return;
        }
        
        try {
            await chrome.storage.sync.clear();
            this.settings = {
                defaultTone: 'professional',
                defaultLanguage: 'en',
                sidebarPosition: 'right',
                autoCopy: false,
                saveHistory: true,
                maxHistoryItems: 50,
                showAnimations: true,
                enableAIFallback: true,
                showTimestamps: true,
                autoProcess: true,
                processingTimeout: 30,
                enableAnalytics: false
            };
            
            this.applySettingsToUI();
            this.showStatus('Settings reset to defaults', 'success');
            
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showStatus('Error resetting settings', 'error');
        }
    }

    async clearAllData() {
        if (!confirm('This will permanently delete all your conversion history and stored data. This action cannot be undone. Are you sure?')) {
            return;
        }
        
        try {
            await chrome.storage.local.clear();
            this.showStatus('All data cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showStatus('Error clearing data', 'error');
        }
    }

    async exportAllData() {
        try {
            const [settings, history, usageStats] = await Promise.all([
                chrome.storage.sync.get(null),
                chrome.storage.local.get('history'),
                chrome.storage.local.get('usageStats')
            ]);
            
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '1.0',
                settings: settings,
                history: history.history || [],
                usageStats: usageStats.usageStats || {}
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemini-nano-backup-${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showStatus('Error exporting data', 'error');
        }
    }

    goBack() {
        window.close(); 
    }

    showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        
        if (type !== 'error') {
            setTimeout(() => {
                status.className = 'status';
                status.textContent = '';
            }, 3000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});