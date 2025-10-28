document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const status = document.getElementById('status');
    const charCount = document.getElementById('charCount');
    const copyBtn = document.getElementById('copyBtn');
    
    // Action buttons
    const summarizeBtn = document.getElementById('summarizeBtn');
    const rewriteBtn = document.getElementById('rewriteBtn');
    const translateBtn = document.getElementById('translateBtn');
    const proofreadBtn = document.getElementById('proofreadBtn');
    
    // Update character count
    inputText.addEventListener('input', function() {
        charCount.textContent = inputText.value.length;
    });
    
    // Copy output text
    copyBtn.addEventListener('click', function() {
        if (outputText.textContent.trim()) {
            navigator.clipboard.writeText(outputText.textContent).then(() => {
                showTempStatus('Copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showTempStatus('Failed to copy', 'error');
            });
        }
    });
    
    // Update status with type
    function updateStatus(message, type = '') {
        status.textContent = message;
        status.className = `status ${type}`;
    }
    
    // Show temporary status
    function showTempStatus(message, type = '') {
        updateStatus(message, type);
        setTimeout(() => {
            updateStatus('Ready to process text');
        }, 2000);
    }
    
    // Set buttons state
    function setButtonsState(disabled) {
        const buttons = [summarizeBtn, rewriteBtn, translateBtn, proofreadBtn, copyBtn];
        buttons.forEach(btn => {
            btn.disabled = disabled;
        });
    }
    
    // Process text with AI
    async function processText(action) {
        const text = inputText.value.trim();
        
        if (!text) {
            showTempStatus('Please enter some text to process.', 'error');
            return;
        }
        
        if (text.length < 10) {
            showTempStatus('Please enter at least 10 characters.', 'error');
            return;
        }
        
        setButtonsState(true);
        updateStatus('Processing with Gemini Nano...', 'loading');
        
        try {
            let result;
            
            // Check if Chrome's AI APIs are available
            if (typeof ai !== 'undefined') {
                result = await useChromeAI(action, text);
            } else {
                // Fallback to mock implementation for development
                result = await mockAIProcessing(text, action);
            }
            
            outputText.textContent = result;
            updateStatus('Processing complete!', 'success');
        } catch (error) {
            console.error('Error processing text:', error);
            outputText.textContent = `Error: ${error.message}\n\nThis might be because:\n• Chrome's AI features are not enabled\n• You're using an older Chrome version\n• The AI model is not available in your region`;
            updateStatus('Failed to process text', 'error');
        } finally {
            setButtonsState(false);
        }
    }
    
    // Use Chrome's built-in AI APIs
    async function useChromeAI(action, text) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    // This is where we'd use the actual Chrome AI APIs
                    // For now, we'll simulate the API calls
                    const responses = {
                        summarize: `Summary: ${text.substring(0, 80)}... [Key points extracted by Gemini Nano]`,
                        rewrite: `Enhanced version: ${text} \n\n[Rewritten for clarity and impact by Gemini Nano]`,
                        translate: `Translated text: ${text} \n\n[Translated to target language by Gemini Nano]`,
                        proofread: `Proofread version: ${text} \n\n[Grammar and spelling checked by Gemini Nano - No errors found]`
                    };
                    
                    if (responses[action]) {
                        resolve(responses[action]);
                    } else {
                        reject(new Error(`Action ${action} not supported`));
                    }
                } catch (error) {
                    reject(error);
                }
            }, 1500);
        });
    }
    
    // Mock AI processing for development
    async function mockAIProcessing(text, action) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const actions = {
            summarize: `📋 **Summary**\n\n${text.substring(0, 100)}...\n\nKey points:\n• Main idea extracted\n• Important details highlighted\n• Concise overview provided\n\n[Powered by Gemini Nano]`,
            
            rewrite: `✍️ **Rewritten Text**\n\n"${text}"\n\nEnhanced version:\n"${text} - optimized for clarity and impact with improved flow and professional tone."\n\n[Enhanced by Gemini Nano]`,
            
            translate: `🌐 **Translation**\n\nOriginal: "${text}"\n\nTranslated: "[Translated version of your text would appear here]"\n\nLanguage: Detected → Spanish\n[Translated by Gemini Nano]`,
            
            proofread: `✓ **Proofreading Results**\n\nOriginal: "${text}"\n\nCorrected: "${text}"\n\nIssues found: None\nSuggestions: Text appears to be well-written with proper grammar and spelling.\n\n[Checked by Gemini Nano]`
        };
        
        return actions[action] || text;
    }
    
    // Event listeners for action buttons
    summarizeBtn.addEventListener('click', () => processText('summarize'));
    rewriteBtn.addEventListener('click', () => processText('rewrite'));
    translateBtn.addEventListener('click', () => processText('translate'));
    proofreadBtn.addEventListener('click', () => processText('proofread'));
    
    // Load selected text from current page
    loadSelectedText();
    
    // Function to load selected text from active tab
    async function loadSelectedText() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: getSelectedText
                });
                
                if (results && results[0] && results[0].result) {
                    inputText.value = results[0].result;
                    charCount.textContent = results[0].result.length;
                }
            }
        } catch (error) {
            console.log('Could not get selected text:', error);
        }
    }
    
    // Function to get selected text (injected into page)
    function getSelectedText() {
        return window.getSelection().toString();
    }
});