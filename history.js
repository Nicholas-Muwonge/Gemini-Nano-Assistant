class HistoryManager {
    constructor() {
        this.history = [];
        this.filteredHistory = [];
        this.currentFilters = {
            action: 'all',
            time: 'all',
            sort: 'newest'
        };
        
        this.init();
    }

    async init() {
        await this.loadHistory();
        this.setupEventListeners();
        this.renderHistory();
        this.updateStats();
    }

    async loadHistory() {
        try {
            const result = await chrome.storage.local.get({ history: [] });
            this.history = result.history;
            this.applyFilters();
        } catch (error) {
            console.error('Error loading history:', error);
            this.showStatus('Error loading history', 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('emptyBackBtn').addEventListener('click', () => this.goBack());
        
        document.getElementById('exportHistory').addEventListener('click', () => this.exportHistory());
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        document.getElementById('refreshHistory').addEventListener('click', () => this.refreshHistory());
        
        document.getElementById('actionFilter').addEventListener('change', (e) => {
            this.currentFilters.action = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('timeFilter').addEventListener('change', (e) => {
            this.currentFilters.time = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('sortFilter').addEventListener('change', (e) => {
            this.currentFilters.sort = e.target.value;
            this.applyFilters();
        });
    }

    applyFilters() {
        let filtered = [...this.history];
        
        if (this.currentFilters.action !== 'all') {
            filtered = filtered.filter(item => item.action === this.currentFilters.action);
        }
        
        const now = new Date();
        if (this.currentFilters.time !== 'all') {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.timestamp);
                const diffTime = now - itemDate;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                switch (this.currentFilters.time) {
                    case 'today':
                        return diffDays < 1;
                    case 'week':
                        return diffDays < 7;
                    case 'month':
                        return diffDays < 30;
                    default:
                        return true;
                }
            });
        }
        
        switch (this.currentFilters.sort) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                break;
            case 'action':
                filtered.sort((a, b) => a.action.localeCompare(b.action));
                break;
        }
        
        this.filteredHistory = filtered;
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredHistory.length === 0) {
            historyList.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        historyList.innerHTML = '';
        
        this.filteredHistory.forEach((item, index) => {
            const historyItem = this.createHistoryItem(item, index);
            historyList.appendChild(historyItem);
        });
    }

    createHistoryItem(item, index) {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const actionIcons = {
            summarize: '📋',
            rewrite: '✍️',
            translate: '🌐',
            proofread: '✓',
            expand: '📈',
            simplify: '💡'
        };
        
        const actionNames = {
            summarize: 'Summary',
            rewrite: 'Rewrite',
            translate: 'Translation',
            proofread: 'Proofread',
            expand: 'Expansion',
            simplify: 'Simplification'
        };
        
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        div.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-main">
                    <div class="history-icon">
                        ${actionIcons[item.action] || '✨'}
                    </div>
                    <div class="history-content">
                        <div class="history-action">${actionNames[item.action]}</div>
                        <div class="history-preview">
                            ${this.truncateText(item.input, 80)}
                        </div>
                    </div>
                </div>
                <div class="history-meta">
                    <span class="history-timestamp">${formattedDate}</span>
                    <span class="history-badge">${item.action}</span>
                </div>
            </div>
            <div class="history-detail">
                <div class="detail-content">
                    <div class="detail-grid">
                        <div class="detail-section">
                            <div class="detail-label">Original Input</div>
                            <div class="detail-text">${item.input}</div>
                        </div>
                        <div class="detail-section">
                            <div class="detail-label">AI Result</div>
                            <div class="detail-text">${item.output}</div>
                        </div>
                    </div>
                    <div class="detail-meta" style="margin-top: 15px; font-size: 0.8rem; color: var(--text-tertiary);">
                        Tone: ${item.tone || 'professional'} • Language: ${item.language || 'en'}
                    </div>
                </div>
            </div>
        `;
        
        const header = div.querySelector('.history-item-header');
        const detail = div.querySelector('.history-detail');
        
        header.addEventListener('click', () => {
            const isExpanded = detail.classList.contains('expanded');
            
            document.querySelectorAll('.history-detail.expanded').forEach(expandedDetail => {
                if (expandedDetail !== detail) {
                    expandedDetail.classList.remove('expanded');
                }
            });
            
            detail.classList.toggle('expanded', !isExpanded);
        });
        
        return div;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    updateStats() {
        const total = this.history.length;
        const today = this.history.filter(item => {
            const itemDate = new Date(item.timestamp);
            const today = new Date();
            return itemDate.toDateString() === today.toDateString();
        }).length;
        
        const actionCounts = {};
        this.history.forEach(item => {
            actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
        });
        const frequentAction = Object.keys(actionCounts).reduce((a, b) => 
            actionCounts[a] > actionCounts[b] ? a : b, 'none'
        );
        
        const avgLength = this.history.length > 0 
            ? Math.round(this.history.reduce((sum, item) => sum + item.input.length, 0) / this.history.length)
            : 0;
        
        document.getElementById('totalConversions').textContent = total;
        document.getElementById('todayConversions').textContent = today;
        document.getElementById('frequentAction').textContent = frequentAction !== 'none' ? frequentAction : '-';
        document.getElementById('avgLength').textContent = avgLength;
    }

    async exportHistory() {
        if (this.history.length === 0) {
            this.showStatus('No history to export', 'error');
            return;
        }
        
        try {
            const csv = this.convertToCSV(this.history);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemini-nano-history-${new Date().getTime()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('History exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting history:', error);
            this.showStatus('Error exporting history', 'error');
        }
    }

    convertToCSV(data) {
        const headers = ['Timestamp', 'Action', 'Input', 'Output', 'Tone', 'Language'];
        const csv = [headers.join(',')];
        
        data.forEach(item => {
            const row = headers.map(header => {
                let value = item[header.toLowerCase()] || '';
                value = String(value).replace(/"/g, '""');
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value}"`;
                }
                return value;
            });
            csv.push(row.join(','));
        });
        
        return csv.join('\n');
    }

    async clearHistory() {
        if (!confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            return;
        }
        
        try {
            await chrome.storage.local.set({ history: [] });
            this.history = [];
            this.filteredHistory = [];
            this.renderHistory();
            this.updateStats();
            this.showStatus('History cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showStatus('Error clearing history', 'error');
        }
    }

    async refreshHistory() {
        await this.loadHistory();
        this.updateStats();
        this.showStatus('History refreshed', 'info');
        setTimeout(() => this.hideStatus(), 2000);
    }

    goBack() {
        window.close(); 
    }

    showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        if (type !== 'error') {
            setTimeout(() => this.hideStatus(), 3000);
        }
    }

    hideStatus() {
        const status = document.getElementById('status');
        status.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HistoryManager();
});