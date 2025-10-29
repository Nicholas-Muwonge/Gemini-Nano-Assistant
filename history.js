document.addEventListener('DOMContentLoaded', function() {
    const historyList = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyState');
    const clearHistory = document.getElementById('clearHistory');
    const exportHistory = document.getElementById('exportHistory');
    const backBtn = document.getElementById('backBtn');
    const status = document.getElementById('status');

    loadHistory();

    clearHistory.addEventListener('click', clearAllHistory);
    exportHistory.addEventListener('click', exportAllHistory);
    backBtn.addEventListener('click', () => window.close());

    async function loadHistory() {
        try {
            const result = await chrome.storage.local.get({ history: [] });
            const history = result.history;

            if (history.length === 0) {
                emptyState.style.display = 'block';
                historyList.style.display = 'none';
                return;
            }

            emptyState.style.display = 'none';
            historyList.style.display = 'block';
            historyList.innerHTML = '';

            history.forEach(item => {
                const historyItem = createHistoryItem(item);
                historyList.appendChild(historyItem);
            });
        } catch (error) {
            console.error('Error loading history:', error);
            updateStatus('Error loading history', 'error');
        }
    }

    function createHistoryItem(item) {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const actionNames = {
            summarize: 'Summary',
            rewrite: 'Rewrite',
            translate: 'Translation',
            proofread: 'Proofread',
            expand: 'Expansion',
            simplify: 'Simplification'
        };

        const date = new Date(item.timestamp).toLocaleString();

        div.innerHTML = `
            <div class="history-header">
                <span class="history-action">${actionNames[item.action]}</span>
                <span class="history-timestamp">${date}</span>
            </div>
            <div class="history-preview">
                <strong>Input:</strong> ${item.input.substring(0, 100)}${item.input.length > 100 ? '...' : ''}
            </div>
            <div class="history-detail">
                <div class="detail-section">
                    <div class="detail-label">Original Text</div>
                    <div class="detail-content">${item.input}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Result</div>
                    <div class="detail-content">${item.output}</div>
                </div>
            </div>
        `;

        div.addEventListener('click', (e) => {
            if (!e.target.closest('.history-detail')) {
                const detail = div.querySelector('.history-detail');
                detail.classList.toggle('show');
            }
        });

        return div;
    }

    async function clearAllHistory() {
        if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            try {
                await chrome.storage.local.set({ history: [] });
                await loadHistory();
                updateStatus('History cleared', 'success');
            } catch (error) {
                console.error('Error clearing history:', error);
                updateStatus('Error clearing history', 'error');
            }
        }
    }

    async function exportAllHistory() {
        try {
            const result = await chrome.storage.local.get({ history: [] });
            const history = result.history;

            if (history.length === 0) {
                updateStatus('No history to export', 'error');
                return;
            }

            const exportData = history.map(item => ({
                Timestamp: new Date(item.timestamp).toLocaleString(),
                Action: item.action,
                Input: item.input,
                Output: item.output,
                Tone: item.tone,
                Language: item.language
            }));

            const csv = convertToCSV(exportData);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemini-nano-history-${new Date().getTime()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            updateStatus('History exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting history:', error);
            updateStatus('Error exporting history', 'error');
        }
    }

    function convertToCSV(data) {
        const headers = ['Timestamp', 'Action', 'Input', 'Output', 'Tone', 'Language'];
        const csv = [headers.join(',')];
        
        data.forEach(item => {
            const row = headers.map(header => {
                let value = item[header] || '';
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

    function updateStatus(message, type = '') {
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
        }, 3000);
    }
});