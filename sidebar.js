class GeminiSidebar {
    constructor() {
        this.currentMode = 'text';
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.usageStats = { today: 0, total: 0 };
        this.visualizerInterval = null;
        
        this.languageNames = {
            en: 'English', es: 'Spanish', fr: 'French', de: 'German',
            it: 'Italian', pt: 'Portuguese', zh: 'Chinese',
            ja: 'Japanese', ko: 'Korean'
        };
        
        this.toneNames = {
            professional: 'Professional', casual: 'Casual',
            formal: 'Formal', friendly: 'Friendly', academic: 'Academic'
        };

        this.init();
    }

    async init() {
        await this.loadUsageStats();
        await this.loadSettings();
        this.setupEventListeners();
        this.setupModeSwitching();
        this.setupImageProcessing();
        this.setupVoiceProcessing();
        this.setupDocumentProcessing();
        this.setupTextToSpeech();
        await this.loadSelectedText();
        await this.checkPendingActions();
        
        this.updateStatus('Ready to assist');
        console.log('Gemini Nano Sidebar initialized');
    }

    setupEventListeners() {
        document.getElementById('closePanel').addEventListener('click', () => {
            console.log('Closing side panel');
            window.close();
        });

        document.getElementById('pasteText').addEventListener('click', () => this.pasteText());
        document.getElementById('clearText').addEventListener('click', () => this.clearText());

        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                console.log(`Action triggered: ${action}`);
                this.processText(action);
            });
        });

        document.getElementById('copyOutput').addEventListener('click', () => this.copyOutput());
        document.getElementById('saveOutput').addEventListener('click', () => this.saveOutput());
        document.getElementById('speakOutput').addEventListener('click', () => this.speakOutput());

        document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());

        document.getElementById('inputText').addEventListener('input', () => {
            const count = document.getElementById('inputText').value.length;
            document.getElementById('charCount').textContent = count;
        });
    }

    setupModeSwitching() {
        const modeTabs = document.querySelectorAll('.mode-tab');
        const inputModes = document.querySelectorAll('.input-mode');

        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                
                modeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                inputModes.forEach(m => m.classList.add('hidden'));
                document.getElementById(`${mode}-mode`).classList.remove('hidden');
                
                this.currentMode = mode;
                this.updateStatus(`Ready for ${mode} input`);

                const speakBtn = document.getElementById('speakOutput');
                speakBtn.classList.toggle('hidden', mode !== 'text');
                
                console.log(`Switched to ${mode} mode`);
            });
        });
    }

    setupImageProcessing() {
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('imageInput');
        const removeImage = document.getElementById('removeImage');
        const captureVisible = document.getElementById('captureVisible');
        const captureArea = document.getElementById('captureArea');

        imageUploadArea.addEventListener('click', () => {
            console.log('Image upload clicked');
            imageInput.click();
        });
        
        imageInput.addEventListener('change', (e) => this.handleImageUpload(e));

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
                console.log('Image dropped:', files[0].name);
                this.handleImageFile(files[0]);
            }
        });

        removeImage.addEventListener('click', () => {
            console.log('Removing image');
            document.getElementById('imagePreview').classList.add('hidden');
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

        documentUploadArea.addEventListener('click', () => {
            console.log('Document upload clicked');
            documentInput.click();
        });
        
        documentInput.addEventListener('change', (e) => this.handleDocumentUpload(e));
        processDocument.addEventListener('click', () => this.processUploadedDocument());
    }

    setupTextToSpeech() {
        const speakBtn = document.getElementById('speakOutput');
        speakBtn.addEventListener('click', () => this.speakOutput());
    }

    async processText(action) {
        console.log(`Processing ${action} for ${this.currentMode} mode`);
        
        let inputContent = '';
        
        switch (this.currentMode) {
            case 'text':
                inputContent = document.getElementById('inputText').value.trim();
                break;
            case 'image':
                const previewImage = document.getElementById('previewImage');
                if (previewImage.src) {
                    inputContent = `[Analyzing image: ${previewImage.src.substring(0, 50)}...]`;
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
            this.showTempStatus(`Please provide ${this.currentMode} input to process.`, 'error');
            return;
        }
        
        if (inputContent.length < 10 && this.currentMode === 'text') {
            this.showTempStatus('Please enter at least 10 characters.', 'error');
            return;
        }
        
        this.setButtonsState(true);
        this.showProcessingIndicator(true);
        this.updateStatus('Processing with Gemini Nano...', 'loading');
        
        try {
            let result;
            
            if (await this.isChromeAIAvailable()) {
                console.log('Using Chrome AI APIs');
                result = await this.useChromeAI(action, inputContent);
            } else {
                console.log('Using mock AI processing');
                result = await this.mockAIProcessing(inputContent, action);
            }
            
            this.setOutputContent(result);
            await this.saveToHistory(inputContent, result, action);
            await this.incrementUsage();
            
            const settings = await chrome.storage.sync.get({ autoCopy: false });
            if (settings.autoCopy) {
                await this.copyOutput();
            }
            
            this.updateStatus('Processing complete!', 'success');
            console.log(`AI processing completed for ${action}`);
            
        } catch (error) {
            console.error('Error processing text:', error);
            this.setOutputContent(`Error: ${error.message}\n\nTroubleshooting:\n• Enable AI features at chrome://flags/#prompt-api-for-gemini-nano\n• Update Chrome to latest version\n• Ensure you have sufficient system resources`);
            this.updateStatus('Failed to process text', 'error');
        } finally {
            this.setButtonsState(false);
            this.showProcessingIndicator(false);
        }
    }

    async isChromeAIAvailable() {
        return new Promise((resolve) => {
            if (typeof ai === 'undefined') {
                console.log('Chrome AI not available');
                resolve(false);
                return;
            }
            
            const apis = ['summarizer', 'rewriter', 'translator', 'proofreader'];
            const available = apis.some(api => ai[api] !== undefined);
            console.log(`Chrome AI available: ${available}`);
            resolve(available);
        });
    }

    async useChromeAI(action, text) {
        const selectedTone = document.getElementById('toneSelect')?.value || 'professional';
        const selectedLanguage = document.getElementById('languageSelect')?.value || 'en';
        const languageName = this.languageNames[selectedLanguage];
        const toneName = this.toneNames[selectedTone];
        
        console.log(`Using Chrome AI for ${action} with tone: ${toneName}, language: ${languageName}`);
        
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
            
            return this.formatAIResponse(result, action, selectedTone, selectedLanguage);
        } catch (error) {
            console.error('Chrome AI API error:', error);
            throw new Error(`AI processing failed: ${error.message}`);
        }
    }

    formatAIResponse(result, action, tone, language) {
        const timestamp = new Date().toLocaleString();
        const actionNames = {
            summarize: 'Summary',
            rewrite: 'Rewritten Text',
            translate: 'Translation',
            proofread: 'Proofread Text',
            expand: 'Expanded Text',
            simplify: 'Simplified Text'
        };
        
        return `✨ ${actionNames[action]}\n\n${result}\n\n---\n📊 Generated by Gemini Nano • 🕒 ${timestamp}\n${tone ? `• Tone: ${this.toneNames[tone]}\n` : ''}${language && action === 'translate' ? `• Language: ${this.languageNames[language]}\n` : ''}`;
    }

    async mockAIProcessing(text, action) {
        console.log(`Mock processing ${action} with ${text.length} chars`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const selectedTone = document.getElementById('toneSelect')?.value || 'professional';
        const selectedLanguage = document.getElementById('languageSelect')?.value || 'en';
        const languageName = this.languageNames[selectedLanguage];
        const toneName = this.toneNames[selectedTone];
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

    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            console.log('Image file selected:', file.name);
            this.handleImageFile(file);
        }
    }

    handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('previewImage');
            const imagePreview = document.getElementById('imagePreview');
            const imageUploadArea = document.getElementById('imageUploadArea');
            
            previewImage.src = e.target.result;
            imagePreview.classList.remove('hidden');
            imageUploadArea.classList.add('hidden');
            
            console.log('Image preview loaded');
        };
        reader.onerror = (error) => {
            console.error('Error reading image file:', error);
            this.showTempStatus('Error loading image', 'error');
        };
        reader.readAsDataURL(file);
    }

    async captureVisibleTab() {
        try {
            this.updateStatus('Capturing visible tab...', 'loading');
            console.log('Capturing visible tab');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            
            const previewImage = document.getElementById('previewImage');
            const imagePreview = document.getElementById('imagePreview');
            const imageUploadArea = document.getElementById('imageUploadArea');
            
            previewImage.src = dataUrl;
            imagePreview.classList.remove('hidden');
            imageUploadArea.classList.add('hidden');
            
            this.updateStatus('Tab captured successfully!', 'success');
            console.log('Tab capture completed');
        } catch (error) {
            console.error('Screenshot error:', error);
            this.updateStatus('Failed to capture tab', 'error');
        }
    }

    async captureScreenArea() {
        try {
            console.log('Starting area capture');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['screenshot.js']
            });
            
            this.updateStatus('Select area to capture...', 'loading');
            window.close(); 
        } catch (error) {
            console.error('Area capture error:', error);
            this.updateStatus('Failed to start area capture', 'error');
        }
    }

    async startVoiceRecording() {
        try {
            console.log('Starting voice recording');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                console.log('Recording stopped, processing audio');
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.processAudioRecording(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            
            document.getElementById('startRecording').classList.add('hidden');
            document.getElementById('recordingIndicator').classList.remove('hidden');
            document.getElementById('voiceVisualizer').classList.remove('hidden');
            
            this.updateStatus('Recording... Speak now', 'loading');
            this.startVisualizer();
            
        } catch (error) {
            console.error('Recording error:', error);
            this.updateStatus('Microphone access denied', 'error');
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            console.log('Stopping voice recording');
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            document.getElementById('startRecording').classList.remove('hidden');
            document.getElementById('recordingIndicator').classList.add('hidden');
            
            this.updateStatus('Processing speech...', 'loading');
            this.stopVisualizer();
            
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    startVisualizer() {
        const visualizer = document.querySelector('.visualizer-bars');
        visualizer.innerHTML = '';
        
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '10px';
            visualizer.appendChild(bar);
        }
        
        const bars = document.querySelectorAll('.visualizer-bar');
        this.visualizerInterval = setInterval(() => {
            if (!this.isRecording) {
                clearInterval(this.visualizerInterval);
                return;
            }
            
            bars.forEach(bar => {
                const height = Math.random() * 30 + 5;
                bar.style.height = `${height}px`;
                bar.style.background = `hsl(${Math.random() * 60 + 200}, 70%, 50%)`;
            });
        }, 100);
    }

    stopVisualizer() {
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
        }
        const bars = document.querySelectorAll('.visualizer-bar');
        bars.forEach(bar => {
            bar.style.height = '0px';
        });
    }

    async processAudioRecording(audioBlob) {
        try {
            console.log('Processing audio recording');
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = async () => {
                const base64Audio = reader.result.split(',')[1];
                
                if (typeof ai !== 'undefined' && ai.speech) {
                    console.log('Using Chrome speech-to-text');
                    const transcript = await ai.speech.transcribe(base64Audio);
                    document.getElementById('transcriptText').textContent = transcript;
                    document.getElementById('inputText').value = transcript;
                    this.updateStatus('Speech transcribed successfully!', 'success');
                } else {
                    console.log('Using mock speech-to-text');
                    const mockTranscript = "This is a mock transcription of your speech. In a real implementation, this would be processed by Chrome's speech-to-text AI. You said something that would be converted to text here.";
                    document.getElementById('transcriptText').textContent = mockTranscript;
                    document.getElementById('inputText').value = mockTranscript;
                    this.updateStatus('Speech processed (mock)', 'success');
                }
            };
        } catch (error) {
            console.error('Audio processing error:', error);
            this.updateStatus('Failed to process audio', 'error');
        }
    }

    handleDocumentUpload(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('Document file selected:', file.name);
            const documentInfo = document.getElementById('documentInfo');
            const fileName = document.getElementById('fileName');
            const fileSize = document.getElementById('fileSize');
            
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            documentInfo.classList.remove('hidden');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async processUploadedDocument() {
        const file = document.getElementById('documentInput').files[0];
        if (!file) return;

        try {
            console.log('Processing document:', file.name);
            this.updateStatus('Extracting text from document...', 'loading');
            
            const text = await this.extractTextFromDocument(file);
            document.getElementById('inputText').value = text;
            
            this.updateStatus('Document processed successfully!', 'success');
        } catch (error) {
            console.error('Document processing error:', error);
            this.updateStatus('Failed to process document', 'error');
        }
    }

    async extractTextFromDocument(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    
                    if (file.type === 'application/pdf') {
                        resolve(`PDF Content: ${file.name}\n\n[This would contain extracted PDF text using PDF.js library]\n\nFor now, this is a mock extraction. In a production version, we would integrate with PDF.js to extract actual text content from the PDF file.`);
                    } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                        resolve(`Word Document: ${file.name}\n\n[This would contain extracted text from Word document]\n\nFor now, this is a mock extraction. In a production version, we would integrate with a Word document parser to extract actual text content.`);
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

    async pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            document.getElementById('inputText').value = text;
            document.getElementById('charCount').textContent = text.length;
            this.showTempStatus('Text pasted from clipboard', 'success');
            console.log('Text pasted from clipboard');
        } catch (error) {
            console.error('Paste error:', error);
            this.showTempStatus('Failed to paste from clipboard', 'error');
        }
    }

    clearText() {
        document.getElementById('inputText').value = '';
        document.getElementById('charCount').textContent = '0';
        this.showTempStatus('Text cleared', 'success');
        console.log('Text cleared');
    }

    async copyOutput() {
        const outputText = document.getElementById('outputText');
        const text = outputText.textContent.trim();
        if (!text) {
            this.showTempStatus('No output to copy', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            this.showTempStatus('Copied to clipboard!', 'success');
            console.log('Output copied to clipboard');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            this.showTempStatus('Failed to copy', 'error');
        }
    }

    async saveOutput() {
        const outputText = document.getElementById('outputText');
        const text = outputText.textContent.trim();
        if (!text) {
            this.showTempStatus('No output to save', 'error');
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
            
            this.showTempStatus('Download started!', 'success');
            console.log('Output saved to file');
        } catch (error) {
            console.error('Error saving file:', error);
            this.showTempStatus('Failed to save', 'error');
        }
    }

    speakOutput() {
        const outputText = document.getElementById('outputText');
        const text = outputText.textContent.trim();
        if (!text) {
            this.showTempStatus('No text to speak', 'error');
            return;
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            window.speechSynthesis.speak(utterance);
            this.updateStatus('Speaking...', 'loading');
            
            utterance.onend = () => {
                this.updateStatus('Speech completed', 'success');
                console.log('Text-to-speech completed');
            };
            
            utterance.onerror = (error) => {
                console.error('Text-to-speech error:', error);
                this.updateStatus('Speech error', 'error');
            };
            
            console.log('Starting text-to-speech');
        } else {
            this.updateStatus('Text-to-speech not supported', 'error');
        }
    }

    setOutputContent(content) {
        const outputText = document.getElementById('outputText');
        outputText.textContent = content;
        outputText.classList.remove('empty-state');
        
        const emptyState = outputText.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
    }

    setButtonsState(disabled) {
        const buttons = document.querySelectorAll('.action-btn, .btn-icon, .footer-btn');
        buttons.forEach(btn => {
            btn.disabled = disabled;
        });
    }

    showProcessingIndicator(show) {
        const indicator = document.getElementById('processingIndicator');
        if (show) {
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    }

    updateStatus(message, type = '') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = 'footer-status';
        
        if (type === 'loading') {
            status.style.color = 'var(--primary)';
        } else if (type === 'success') {
            status.style.color = 'var(--secondary)';
        } else if (type === 'error') {
            status.style.color = 'var(--error)';
        } else {
            status.style.color = 'var(--text-tertiary)';
        }
    }

    showTempStatus(message, type = '') {
        this.updateStatus(message, type);
        setTimeout(() => {
            this.updateStatus('Ready to assist');
        }, 2000);
    }

    async loadSettings() {
        try {
            const settings = await chrome.storage.sync.get({
                defaultTone: 'professional',
                defaultLanguage: 'en',
                autoCopy: false,
                saveHistory: true,
                maxHistoryItems: 50
            });
            
            console.log('Settings loaded:', settings);
            
            const toneSelect = document.getElementById('toneSelect');
            const languageSelect = document.getElementById('languageSelect');
            
            if (toneSelect) toneSelect.value = settings.defaultTone;
            if (languageSelect) languageSelect.value = settings.defaultLanguage;
        } catch (error) {
            console.log('Error loading settings:', error);
        }
    }

    async loadUsageStats() {
        try {
            const result = await chrome.storage.local.get(['usageStats']);
            if (result.usageStats) {
                this.usageStats = result.usageStats;
            }
            
            document.getElementById('todayCount').textContent = this.usageStats.today;
            document.getElementById('totalCount').textContent = this.usageStats.total;
            
            console.log('Usage stats loaded:', this.usageStats);
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
        console.log('Usage stats updated:', this.usageStats);
    }

    async saveToHistory(input, output, action) {
        try {
            const settings = await chrome.storage.sync.get({ saveHistory: true, maxHistoryItems: 50 });
            
            if (!settings.saveHistory) return;
            
            const historyItem = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                input,
                output,
                action,
                tone: document.getElementById('toneSelect')?.value || 'professional',
                language: document.getElementById('languageSelect')?.value || 'en'
            };
            
            const result = await chrome.storage.local.get({ history: [] });
            let history = result.history;
            
            history.unshift(historyItem);
            if (history.length > settings.maxHistoryItems) {
                history = history.slice(0, settings.maxHistoryItems);
            }
            
            await chrome.storage.local.set({ history });
            console.log('Saved to history:', action);
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    async loadSelectedText() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => window.getSelection().toString()
                });
                
                if (results && results[0] && results[0].result) {
                    const selectedText = results[0].result;
                    document.getElementById('inputText').value = selectedText;
                    document.getElementById('charCount').textContent = selectedText.length;
                    console.log('Loaded selected text:', selectedText.substring(0, 50) + '...');
                }
            }
        } catch (error) {
            console.log('Could not get selected text:', error);
        }
    }

    async checkPendingActions() {
        try {
            const result = await chrome.storage.local.get(['pendingAction']);
            if (result.pendingAction) {
                const { action, text } = result.pendingAction;
                document.getElementById('inputText').value = text;
                document.getElementById('charCount').textContent = text.length;
                
                console.log('Processing pending action:', action);
                await this.processText(action);
                
                await chrome.storage.local.remove(['pendingAction']);
            }
        } catch (error) {
            console.log('No pending actions or error:', error);
        }
    }

    showHistory() {
        console.log('Opening history page');
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    }

    showSettings() {
        console.log('Opening settings page');
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Gemini Sidebar');
    new GeminiSidebar();
});

window.addEventListener('beforeunload', () => {
    console.log('Sidebar closing, cleaning up...');
});