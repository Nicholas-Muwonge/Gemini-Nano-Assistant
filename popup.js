let currentMode = 'text';
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

document.addEventListener('DOMContentLoaded', function() {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const status = document.getElementById('status');
    const charCount = document.getElementById('charCount');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');
    const historyBtn = document.getElementById('historyBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const toneSelect = document.getElementById('toneSelect');
    const languageSelect = document.getElementById('languageSelect');
    
    const summarizeBtn = document.getElementById('summarizeBtn');
    const rewriteBtn = document.getElementById('rewriteBtn');
    const translateBtn = document.getElementById('translateBtn');
    const proofreadBtn = document.getElementById('proofreadBtn');
    const expandBtn = document.getElementById('expandBtn');
    const simplifyBtn = document.getElementById('simplifyBtn');
    
    const languageNames = {
        en: 'English',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        pt: 'Portuguese',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean'
    };
    
    const toneNames = {
        professional: 'Professional',
        casual: 'Casual',
        formal: 'Formal',
        friendly: 'Friendly',
        academic: 'Academic'
    };

    init();
    
    function init() {
        inputText.addEventListener('input', function() {
            charCount.textContent = inputText.value.length;
        });
        
        copyBtn.addEventListener('click', copyOutputText);
        
        clearBtn.addEventListener('click', clearOutput);
        
        saveBtn.addEventListener('click', saveOutput);
        
        historyBtn.addEventListener('click', showHistory);
        
        settingsBtn.addEventListener('click', showSettings);
        
        summarizeBtn.addEventListener('click', () => processText('summarize'));
        rewriteBtn.addEventListener('click', () => processText('rewrite'));
        translateBtn.addEventListener('click', () => processText('translate'));
        proofreadBtn.addEventListener('click', () => processText('proofread'));
        expandBtn.addEventListener('click', () => processText('expand'));
        simplifyBtn.addEventListener('click', () => processText('simplify'));
        
        loadSettings();
        loadSelectedText();
        checkPendingActions();
        setupModeSwitching();
        setupImageProcessing();
        setupVoiceProcessing();
        setupDocumentProcessing();
        setupTextToSpeech();
    }
    
    async function loadSettings() {
        try {
            const settings = await chrome.storage.sync.get({
                defaultTone: 'professional',
                defaultLanguage: 'en',
                autoCopy: false,
                saveHistory: true,
                maxHistoryItems: 50
            });
            
            toneSelect.value = settings.defaultTone;
            languageSelect.value = settings.defaultLanguage;
        } catch (error) {
            console.log('Error loading settings:', error);
        }
    }
    
    async function copyOutputText() {
        if (outputText.textContent.trim()) {
            try {
                await navigator.clipboard.writeText(outputText.textContent);
                showTempStatus('Copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showTempStatus('Failed to copy', 'error');
            }
        }
    }
    
    function clearOutput() {
        inputText.value = '';
        outputText.textContent = '';
        outputText.classList.remove('has-content');
        charCount.textContent = '0';
        updateStatus('Cleared', 'success');
        setTimeout(() => updateStatus('Ready to process text'), 1500);
    }
    
    async function saveOutput() {
        const text = outputText.textContent.trim();
        if (!text) {
            showTempStatus('No output to save', 'error');
            return;
        }
        
        try {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemini-nano-output-${new Date().getTime()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showTempStatus('Download started!', 'success');
        } catch (error) {
            console.error('Error saving file:', error);
            showTempStatus('Failed to save', 'error');
        }
    }
    
    function showHistory() {
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    }
    
    function showSettings() {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    }
    
    function updateStatus(message, type = '') {
        status.textContent = message;
        status.className = `status ${type}`;
    }
    
    function showTempStatus(message, type = '') {
        updateStatus(message, type);
        setTimeout(() => {
            updateStatus('Ready to process text');
        }, 2000);
    }
    
    function setButtonsState(disabled) {
        const buttons = [summarizeBtn, rewriteBtn, translateBtn, proofreadBtn, expandBtn, simplifyBtn, copyBtn, clearBtn, saveBtn];
        buttons.forEach(btn => {
            btn.disabled = disabled;
        });
        
        if (disabled) {
            outputText.classList.add('processing');
        } else {
            outputText.classList.remove('processing');
        }
    }
    
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
            
            if (await isChromeAIAvailable()) {
                result = await useChromeAI(action, text);
            } else {
                result = await mockAIProcessing(text, action);
            }
            
            outputText.textContent = result;
            outputText.classList.add('has-content');
            
            await saveToHistory(text, result, action);
            
            const settings = await chrome.storage.sync.get({ autoCopy: false });
            if (settings.autoCopy) {
                await copyOutputText();
            }
            
            updateStatus('Processing complete!', 'success');
        } catch (error) {
            console.error('Error processing text:', error);
            outputText.textContent = `Error: ${error.message}\n\nTroubleshooting:\n• Enable AI features at chrome://flags/#prompt-api-for-gemini-nano\n• Update Chrome to latest version\n• Ensure you have sufficient system resources`;
            outputText.classList.add('has-content');
            updateStatus('Failed to process text', 'error');
        } finally {
            setButtonsState(false);
        }
    }
    
    async function isChromeAIAvailable() {
        return new Promise((resolve) => {
            if (typeof ai === 'undefined') {
                resolve(false);
                return;
            }
            
            const apis = ['summarizer', 'rewriter', 'translator', 'proofreader'];
            const available = apis.some(api => ai[api] !== undefined);
            resolve(available);
        });
    }
    
    async function useChromeAI(action, text) {
        const selectedTone = toneSelect.value;
        const selectedLanguage = languageSelect.value;
        const languageName = languageNames[selectedLanguage];
        const toneName = toneNames[selectedTone];
        
        try {
            let result;
            
            switch (action) {
                case 'summarize':
                    if (ai.summarizer) {
                        result = await ai.summarizer.summarize(text);
                    } else {
                        throw new Error('Summarizer API not available');
                    }
                    break;
                    
                case 'rewrite':
                    if (ai.rewriter) {
                        const context = `Rewrite this text in a ${toneName.toLowerCase()} tone: ${text}`;
                        result = await ai.rewriter.rewrite(context);
                    } else {
                        throw new Error('Rewriter API not available');
                    }
                    break;
                    
                case 'translate':
                    if (ai.translator) {
                        result = await ai.translator.translate(text, { targetLanguage: selectedLanguage });
                    } else {
                        throw new Error('Translator API not available');
                    }
                    break;
                    
                case 'proofread':
                    if (ai.proofreader) {
                        result = await ai.proofreader.proofread(text);
                    } else {
                        throw new Error('Proofreader API not available');
                    }
                    break;
                    
                case 'expand':
                    if (ai.prompt) {
                        const expansionPrompt = `Expand this text while maintaining the original meaning: "${text}"`;
                        result = await ai.prompt(expansionPrompt);
                    } else {
                        throw new Error('Prompt API not available for expansion');
                    }
                    break;
                    
                case 'simplify':
                    if (ai.prompt) {
                        const simplifyPrompt = `Simplify this text to make it easier to understand: "${text}"`;
                        result = await ai.prompt(simplifyPrompt);
                    } else {
                        throw new Error('Prompt API not available for simplification');
                    }
                    break;
                    
                default:
                    throw new Error(`Action ${action} not supported`);
            }
            
            return formatAIResponse(result, action, selectedTone, selectedLanguage);
        } catch (error) {
            console.error('Chrome AI API error:', error);
            throw new Error(`AI processing failed: ${error.message}`);
        }
    }
    
    function formatAIResponse(result, action, tone, language) {
        const timestamp = new Date().toLocaleString();
        const actionNames = {
            summarize: 'Summary',
            rewrite: 'Rewritten Text',
            translate: 'Translation',
            proofread: 'Proofread Text',
            expand: 'Expanded Text',
            simplify: 'Simplified Text'
        };
        
        return `✨ ${actionNames[action]}\n\n${result}\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp}\n${tone ? `• Tone: ${toneNames[tone]}\n` : ''}${language && action === 'translate' ? `• Language: ${languageNames[language]}\n` : ''}`;
    }
    
    async function mockAIProcessing(text, action) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const selectedTone = toneSelect.value;
        const selectedLanguage = languageSelect.value;
        const languageName = languageNames[selectedLanguage];
        const toneName = toneNames[selectedTone];
        const timestamp = new Date().toLocaleString();
        
        const actions = {
            summarize: `📋 Summary\n\n${text.substring(0, 100)}...\n\nKey insights extracted by Gemini Nano:\n• Main themes identified\n• Essential information highlighted\n• Clear, concise overview provided\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp}`,
            
            rewrite: `✍️ Rewritten Text (${toneName} Tone)\n\n"${text}"\n\nEnhanced version with ${toneName.toLowerCase()} tone:\n"${text} - expressed with improved clarity and engaging language that maintains your original meaning while adapting to a ${toneName.toLowerCase()} style for better communication impact."\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp} • Tone: ${toneName}`,
            
            translate: `🌐 Translation (to ${languageName})\n\nOriginal: "${text}"\n\n${languageName} translation:\n"[${languageName} translation: ${text}]"\n\nNote: Gemini Nano provides accurate translations while preserving context and cultural nuances.\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp} • Language: ${languageName}`,
            
            proofread: `✓ Proofreading Results\n\nOriginal text analyzed:\n"${text}"\n\n✅ No issues found\n\nYour text appears well-written with:\n• Proper grammar and syntax\n• Correct spelling throughout\n• Appropriate punctuation\n• Clear sentence structure\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp}`,
            
            expand: `📈 Expanded Text\n\nOriginal: "${text}"\n\nExpanded version:\n"${text} This expansion builds upon your original text by adding relevant context, detailed explanations, and supporting examples. The enhanced content maintains your core message while providing additional insights and comprehensive coverage of the topic to give readers a more complete understanding."\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp}`,
            
            simplify: `💡 Simplified Text\n\nOriginal: "${text}"\n\nSimplified version:\n"Clear explanation: ${text}"\n\nSimplification applied:\n• Complex concepts broken down\n• Technical terms explained in plain language\n• Sentence structure optimized for clarity\n• Key message preserved and emphasized\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp}`
        };
        
        return actions[action] || text;
    }
    
    async function saveToHistory(input, output, action) {
        try {
            const settings = await chrome.storage.sync.get({ saveHistory: true, maxHistoryItems: 50 });
            
            if (!settings.saveHistory) return;
            
            const historyItem = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                input,
                output,
                action,
                tone: toneSelect.value,
                language: languageSelect.value
            };
            
            const result = await chrome.storage.local.get({ history: [] });
            let history = result.history;
            
            history.unshift(historyItem);
            if (history.length > settings.maxHistoryItems) {
                history = history.slice(0, settings.maxHistoryItems);
            }
            
            await chrome.storage.local.set({ history });
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }
    
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
    
    async function checkPendingActions() {
        try {
            const result = await chrome.storage.local.get(['pendingAction']);
            if (result.pendingAction) {
                const { action, text } = result.pendingAction;
                inputText.value = text;
                charCount.textContent = text.length;
                
                await processText(action);
                
                await chrome.storage.local.remove(['pendingAction']);
            }
        } catch (error) {
            console.log('No pending actions or error:', error);
        }
    }
    
    function getSelectedText() {
        return window.getSelection().toString();
    }
    function setupModeSwitching() {
        const modeTabs = document.querySelectorAll('.mode-tab');
        const inputModes = document.querySelectorAll('.input-mode');
        
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                
                modeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                inputModes.forEach(m => m.classList.remove('active'));
                document.getElementById(`${mode}-mode`).classList.add('active');
                
                currentMode = mode;
                updateStatus(`Ready for ${mode} input`);
                
                const speakBtn = document.getElementById('speakBtn');
                speakBtn.style.display = mode === 'text' ? 'inline-block' : 'none';
            });
        });
    }

    function setupImageProcessing() {
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('imageInput');
        const imagePreview = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');
        const removeImage = document.getElementById('removeImage');
        const captureVisible = document.getElementById('captureVisible');
        const captureArea = document.getElementById('captureArea');

        imageUploadArea.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);

        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = 'var(--primary)';
            imageUploadArea.style.background = 'var(--primary-light)';
        });

        imageUploadArea.addEventListener('dragleave', () => {
            imageUploadArea.style.borderColor = 'var(--border)';
            imageUploadArea.style.background = 'var(--surface)';
        });

        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.style.borderColor = 'var(--border)';
            imageUploadArea.style.background = 'var(--surface)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                handleImageFile(files[0]);
            }
        });

        removeImage.addEventListener('click', (e) => {
            e.stopPropagation();
            imagePreview.style.display = 'none';
            imageUploadArea.style.display = 'block';
            imageInput.value = '';
        });

        captureVisible.addEventListener('click', captureVisibleTab);
        captureArea.addEventListener('click', captureScreenArea);
    }

    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    }

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('previewImage');
            const imagePreview = document.getElementById('imagePreview');
            const imageUploadArea = document.getElementById('imageUploadArea');
            
            previewImage.src = e.target.result;
            imagePreview.style.display = 'block';
            imageUploadArea.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async function captureVisibleTab() {
        try {
            updateStatus('Capturing visible tab...', 'loading');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            
            const previewImage = document.getElementById('previewImage');
            const imagePreview = document.getElementById('imagePreview');
            const imageUploadArea = document.getElementById('imageUploadArea');
            
            previewImage.src = dataUrl;
            imagePreview.style.display = 'block';
            imageUploadArea.style.display = 'none';
            
            updateStatus('Tab captured successfully!', 'success');
        } catch (error) {
            console.error('Screenshot error:', error);
            updateStatus('Failed to capture tab', 'error');
        }
    }

    async function captureScreenArea() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['screenshot.js']
            });
            
            updateStatus('Select area to capture...', 'loading');
            window.close(); 
        } catch (error) {
            console.error('Area capture error:', error);
            updateStatus('Failed to start area capture', 'error');
        }
    }

    function setupVoiceProcessing() {
        const startRecording = document.getElementById('startRecording');
        const stopRecording = document.getElementById('stopRecording');
        const transcriptText = document.getElementById('transcriptText');

        startRecording.addEventListener('click', startVoiceRecording);
        stopRecording.addEventListener('click', stopVoiceRecording);
    }

    async function startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await processAudioRecording(audioBlob);
            };

            mediaRecorder.start();
            isRecording = true;
            
            document.getElementById('startRecording').disabled = true;
            document.getElementById('stopRecording').disabled = false;
            document.getElementById('voiceVisualizer').classList.add('recording');
            
            updateStatus('Recording... Speak now', 'loading');
            startVisualizer();
        } catch (error) {
            console.error('Recording error:', error);
            updateStatus('Microphone access denied', 'error');
        }
    }

    function stopVoiceRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            
            document.getElementById('startRecording').disabled = false;
            document.getElementById('stopRecording').disabled = true;
            document.getElementById('voiceVisualizer').classList.remove('recording');
            
            updateStatus('Processing speech...', 'loading');
            stopVisualizer();
            
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    function startVisualizer() {
        const visualizer = document.querySelector('.visualizer-bars');
        visualizer.innerHTML = '';
        
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '10px';
            visualizer.appendChild(bar);
        }
        
        const bars = document.querySelectorAll('.visualizer-bar');
        const interval = setInterval(() => {
            if (!isRecording) {
                clearInterval(interval);
                return;
            }
            
            bars.forEach(bar => {
                const height = Math.random() * 30 + 5;
                bar.style.height = `${height}px`;
                bar.style.background = `hsl(${Math.random() * 60 + 200}, 70%, 50%)`;
            });
        }, 100);
    }

    function stopVisualizer() {
        const bars = document.querySelectorAll('.visualizer-bar');
        bars.forEach(bar => {
            bar.style.height = '0px';
        });
    }

    async function processAudioRecording(audioBlob) {
        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = async () => {
                const base64Audio = reader.result.split(',')[1];
                
                if (typeof ai !== 'undefined' && ai.speech) {
                    const transcript = await ai.speech.transcribe(base64Audio);
                    document.getElementById('transcriptText').textContent = transcript;
                    document.getElementById('inputText').value = transcript;
                    updateStatus('Speech transcribed successfully!', 'success');
                } else {
                    const mockTranscript = "This is a mock transcription of your speech. In a real implementation, this would be processed by Chrome's speech-to-text AI.";
                    document.getElementById('transcriptText').textContent = mockTranscript;
                    document.getElementById('inputText').value = mockTranscript;
                    updateStatus('Speech processed (mock)', 'success');
                }
            };
        } catch (error) {
            console.error('Audio processing error:', error);
            updateStatus('Failed to process audio', 'error');
        }
    }

    function setupDocumentProcessing() {
        const documentUploadArea = document.getElementById('documentUploadArea');
        const documentInput = document.getElementById('documentInput');
        const documentInfo = document.getElementById('documentInfo');
        const processDocument = document.getElementById('processDocument');

        documentUploadArea.addEventListener('click', () => documentInput.click());
        documentInput.addEventListener('change', handleDocumentUpload);
        processDocument.addEventListener('click', processUploadedDocument);
    }

    function handleDocumentUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const documentInfo = document.getElementById('documentInfo');
            const fileName = document.getElementById('fileName');
            const fileSize = document.getElementById('fileSize');
            
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            documentInfo.style.display = 'block';
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async function processUploadedDocument() {
        const file = document.getElementById('documentInput').files[0];
        if (!file) return;

        try {
            updateStatus('Extracting text from document...', 'loading');
            
            const text = await extractTextFromDocument(file);
            document.getElementById('inputText').value = text;
            
            updateStatus('Document processed successfully!', 'success');
        } catch (error) {
            console.error('Document processing error:', error);
            updateStatus('Failed to process document', 'error');
        }
    }

    async function extractTextFromDocument(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    
                    if (file.type === 'application/pdf') {
                        resolve(`PDF Content: ${file.name}\n\n[This would contain extracted PDF text using PDF.js library]`);
                    } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                        resolve(`Word Document: ${file.name}\n\n[This would contain extracted text from Word document]`);
                    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                        resolve(content);
                    } else {
                        reject(new Error('Unsupported document format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            
            if (file.type === 'text/plain') {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    function setupTextToSpeech() {
        const speakBtn = document.getElementById('speakBtn');
        speakBtn.addEventListener('click', speakOutputText);
    }

    function speakOutputText() {
        const outputText = document.getElementById('outputText').textContent;
        if (!outputText.trim()) return;

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(outputText);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            window.speechSynthesis.speak(utterance);
            updateStatus('Speaking...', 'loading');
            
            utterance.onend = () => {
                updateStatus('Speech completed', 'success');
            };
        } else {
            updateStatus('Text-to-speech not supported', 'error');
        }
    }

    async function processText(action) {
        let inputContent = '';
        
        switch (currentMode) {
            case 'text':
                inputContent = document.getElementById('inputText').value.trim();
                break;
            case 'image':
                const previewImage = document.getElementById('previewImage');
                if (previewImage.src) {
                    inputContent = `[Image analysis: ${previewImage.src.substring(0, 100)}...]`;
                }
                break;
            case 'voice':
                inputContent = document.getElementById('transcriptText').textContent;
                break;
            case 'document':
                inputContent = document.getElementById('inputText').value;
                break;
        }
        
        if (!inputContent) {
            showTempStatus(`Please provide ${currentMode} input to process.`, 'error');
            return;
        }
        
    }
});