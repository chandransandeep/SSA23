// Core Quiz Application Logic
import { getUserDocRef } from './firebase-config.js';
import { QuestionTypes } from './question-types.js';
import { ValidationEngine } from './validation.js';
import { DragDropManager } from './drag-drop.js';

class QuizApp {
    constructor() {
        this.allQuizQuestions = [];
        this.currentQuizQuestions = [];
        this.wronglyAnsweredQuestions = new Set();
        this.sessionAnswers = {};
        this.quizMode = 'retake';
        this.timerInterval = null;
        this.timeRemaining = 0;
        
        // Local storage keys
        this.LS_SETTINGS_KEY = 'quiz_settings';
        this.LS_SESSION_ANSWERS_KEY = 'quiz_session_answers';
        this.LS_WRONG_ANSWERS_KEY = 'quiz_wrong_answers';
        
        this.initializeElements();
        this.bindEvents();
        this.questionTypes = new QuestionTypes();
        this.validator = new ValidationEngine();
        this.dragDrop = new DragDropManager();
    }

    initializeElements() {
        this.elements = {
            questionsContainer: document.getElementById('questions-container'),
            quizForm: document.getElementById('quiz-form'),
            scoreContainer: document.getElementById('score-container'),
            errorMessageDiv: document.getElementById('error-message'),
            numQuestionsInput: document.getElementById('num-questions'),
            enableTimerCheckbox: document.getElementById('enable-timer-checkbox'),
            timeLimitMinutesInput: document.getElementById('time-limit-minutes'),
            timerDisplay: document.getElementById('timer-display'),
            quizTitleInput: document.getElementById('quiz-title-input'),
            quizTitleDisplay: document.getElementById('quiz-title-display'),
            toggleModeBtn: document.getElementById('toggle-mode-btn'),
            retakeQuizBtn: document.getElementById('retake-quiz-btn'),
            clearWrongAnswersBtn: document.getElementById('clear-wrong-answers-btn'),
            clearSessionDataBtn: document.getElementById('clear-session-data-btn'),
            restartAllBtn: document.getElementById('restart-all-btn')
        };
    }

    bindEvents() {
        // Form submission
        this.elements.quizForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Button events
        this.elements.retakeQuizBtn.addEventListener('click', () => this.loadQuiz());
        this.elements.toggleModeBtn.addEventListener('click', () => this.toggleQuizMode());
        this.elements.restartAllBtn.addEventListener('click', () => this.restartAllQuestions());
        this.elements.clearWrongAnswersBtn.addEventListener('click', () => this.clearWrongAnswersHistory());
        this.elements.clearSessionDataBtn.addEventListener('click', () => this.clearSessionData());
        
        // Settings changes
        this.elements.numQuestionsInput.addEventListener('change', () => this.saveSettings());
        this.elements.enableTimerCheckbox.addEventListener('change', () => this.handleTimerToggle());
        this.elements.timeLimitMinutesInput.addEventListener('change', () => this.saveSettings());
        this.elements.quizTitleInput.addEventListener('input', () => this.handleTitleChange());
        
        // Question validation
        this.elements.questionsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('validate-btn')) {
                const index = parseInt(event.target.dataset.questionIndex);
                this.validateSingleQuestion(index);
            }
        });
    }

    async loadQuiz() {
        this.enableQuizInputs();
        this.elements.questionsContainer.innerHTML = 'Loading questions...';

        try {
            const response = await fetch(new URL('questions.csv', window.location.href).href);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}${response.status === 404 ? ' - questions.csv not found' : ''}`);
            }

            const csvText = await response.text();
            this.allQuizQuestions = this.parseCSV(csvText);

            if (this.allQuizQuestions.length === 0) {
                throw new Error('No questions found in questions.csv');
            }

            this.updateQuizStats();

            if (this.checkForCongratulations()) {
                this.elements.questionsContainer.innerHTML = '<p style="text-align: center; font-size: 1.2em; color: #28a745;">🎉 All questions mastered! 🎉</p>';
                this.elements.quizForm.querySelector('.submit-btn').style.display = 'none';
                return;
            }

            const questionsToLoad = this.getQuestionsToLoad();
            const requestedNum = parseInt(this.elements.numQuestionsInput.value);
            const numToPractice = (!isNaN(requestedNum) && requestedNum > 0) ? 
                Math.min(requestedNum, questionsToLoad.length) : questionsToLoad.length;

            this.currentQuizQuestions = questionsToLoad.slice(0, numToPractice);
            this.shuffleArray(this.currentQuizQuestions);

            this.renderQuestions();
            this.startTimer();

        } catch (error) {
            console.error('Error loading questions:', error);
            this.elements.errorMessageDiv.textContent = `Failed to load quiz: ${error.message}`;
            this.elements.questionsContainer.innerHTML = '';
            this.elements.quizForm.querySelector('.submit-btn').style.display = 'none';
        }
    }

    parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(header => header.trim());
        const requiredHeaders = ["QuestionNumber", "QuestionText"];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
        }

        return lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());

            if (values.length !== headers.length) {
                console.warn(`Skipping malformed row: "${line}"`);
                return null;
            }

            const questionObj = headers.reduce((obj, h, i) => {
                obj[h] = values[i];
                return obj;
            }, {});

            // Process question using QuestionTypes
            return this.questionTypes.processQuestion(questionObj);
        }).filter(row => row !== null);
    }

    renderQuestions() {
        const questionsHTML = this.currentQuizQuestions.map((question, index) => 
            this.questionTypes.createQuestionElement(question, index)
        ).join('');
        
        this.elements.questionsContainer.innerHTML = questionsHTML;
        
        // Initialize drag and drop for matching questions
        this.dragDrop.initialize();
    }

    validateSingleQuestion(index) {
        const question = this.currentQuizQuestions[index];
        const result = this.validator.validateQuestion(question, index);
        
        // Update tracking
        const questionText = question.QuestionText;
        if (result === 'correct') {
            this.wronglyAnsweredQuestions.delete(questionText);
        } else if (result === 'wrong' || result === 'partial') {
            this.wronglyAnsweredQuestions.add(questionText);
        }
        
        this.sessionAnswers[questionText] = result;
        this.saveSessionData();
        this.saveWronglyAnsweredQuestions();
        this.updateQuizStats();
        
        return result;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        let score = 0;
        let partialScore = 0;
        
        this.currentQuizQuestions.forEach((question, index) => {
            const result = this.validateSingleQuestion(index);
            if (result === 'correct') {
                score++;
            } else if (result === 'partial') {
                partialScore += 0.5;
            }
        });

        const totalScore = score + partialScore;
        const maxScore = this.currentQuizQuestions.length;
        
        let scoreText = `Your score: ${score} correct`;
        if (partialScore > 0) {
            scoreText += `, ${partialScore} partial credit`;
        }
        scoreText += ` out of ${maxScore} questions`;
        if (partialScore > 0) {
            scoreText += ` (Total: ${totalScore}/${maxScore})`;
        }
        
        this.elements.scoreContainer.textContent = scoreText;
        this.disableQuizInputs();
        this.saveSettings();
        this.updateQuizStats();
    }

    // Timer functions
    startTimer() {
        const enableTimer = this.elements.enableTimerCheckbox.checked;
        const timeLimitMinutes = parseInt(this.elements.timeLimitMinutesInput.value);
        
        clearInterval(this.timerInterval);

        if (enableTimer && !isNaN(timeLimitMinutes) && timeLimitMinutes > 0) {
            this.timeRemaining = timeLimitMinutes * 60;
            this.elements.timerDisplay.style.display = 'block';
            this.updateTimerDisplay();

            this.timerInterval = setInterval(() => {
                this.timeRemaining--;
                this.updateTimerDisplay();
                if (this.timeRemaining <= 0) {
                    clearInterval(this.timerInterval);
                    this.elements.timerDisplay.textContent = 'Time Up!';
                    this.elements.quizForm.dispatchEvent(new Event('submit'));
                }
            }, 1000);
        } else {
            this.elements.timerDisplay.style.display = 'none';
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.elements.timerDisplay.textContent = `Time Remaining: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.timeRemaining <= 30 && this.timeRemaining > 0) {
            this.elements.timerDisplay.style.color = '#ff6347';
        } else if (this.timeRemaining <= 0) {
            this.elements.timerDisplay.style.color = '#c0392b';
        } else {
            this.elements.timerDisplay.style.color = '#e74c3c';
        }
    }

    // Utility functions
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getQuestionsToLoad() {
        if (this.quizMode === 'retake') {
            return this.allQuizQuestions.filter(q => {
                const status = this.sessionAnswers[q.QuestionText];
                return this.wronglyAnsweredQuestions.has(q.QuestionText) || 
                       status === 'wrong' || status === 'partial' || !status;
            });
        } else {
            return [...this.allQuizQuestions];
        }
    }

    enableQuizInputs() {
        clearInterval(this.timerInterval);
        this.elements.timerDisplay.style.display = 'none';
        this.elements.quizForm.querySelectorAll('input, button').forEach(input => input.disabled = false);
        this.elements.quizForm.querySelector('.submit-btn').style.display = 'block';
        this.elements.retakeQuizBtn.style.display = 'none';
        this.elements.scoreContainer.textContent = '';
        this.elements.errorMessageDiv.textContent = '';
    }

    disableQuizInputs() {
        clearInterval(this.timerInterval);
        this.elements.quizForm.querySelectorAll('input[type="radio"], input[type="checkbox"], .text-input, .blank-input').forEach(input => input.disabled = true);
        this.elements.quizForm.querySelector('.submit-btn').style.display = 'none';
        this.elements.quizForm.querySelectorAll('.validate-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = 0.5;
            btn.style.cursor = 'not-allowed';
        });
        this.elements.retakeQuizBtn.style.display = 'block';
    }

    // Settings and data management
    async saveSettings() {
        const settings = {
            numQuestions: this.elements.numQuestionsInput.value || 'all',
            enableTimer: this.elements.enableTimerCheckbox.checked,
            timeLimitMinutes: parseInt(this.elements.timeLimitMinutesInput.value) || 10,
            quizTitle: this.elements.quizTitleInput.value || "Enhanced Exam Preparation Quiz",
            lastUpdated: new Date()
        };

        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                await window.setDoc(getUserDocRef(window.currentUserId), settings, { merge: true });
                console.log("Settings saved to Firestore.");
            } catch (e) {
                console.error("Error saving settings:", e);
                this.saveSettingsToLocalStorage(settings);
            }
        } else {
            this.saveSettingsToLocalStorage(settings);
        }
    }

    async loadSettings() {
        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    this.applySettings(data);
                    return;
                }
            } catch (e) {
                console.error("Error loading settings:", e);
            }
        }
        this.loadSettingsFromLocalStorage();
    }

    applySettings(settings) {
        this.elements.numQuestionsInput.value = settings.numQuestions || '';
        this.elements.enableTimerCheckbox.checked = settings.enableTimer || false;
        this.elements.timeLimitMinutesInput.value = settings.timeLimitMinutes || 10;
        this.elements.quizTitleInput.value = settings.quizTitle || "Enhanced Exam Preparation Quiz";
        this.elements.quizTitleDisplay.textContent = this.elements.quizTitleInput.value;
        document.title = this.elements.quizTitleInput.value;
    }

    saveSettingsToLocalStorage(settings) {
        localStorage.setItem(this.LS_SETTINGS_KEY, JSON.stringify(settings));
    }

    loadSettingsFromLocalStorage() {
        const settings = JSON.parse(localStorage.getItem(this.LS_SETTINGS_KEY) || '{}');
        this.applySettings(settings);
    }

    async saveSessionData() {
        localStorage.setItem(this.LS_SESSION_ANSWERS_KEY, JSON.stringify(this.sessionAnswers));
        
        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                await window.setDoc(getUserDocRef(window.currentUserId), {
                    sessionAnswers: JSON.stringify(this.sessionAnswers),
                    lastUpdated: new Date()
                }, { merge: true });
            } catch (e) {
                console.error("Error saving session data:", e);
            }
        }
    }

    async loadSessionData() {
        const stored = localStorage.getItem(this.LS_SESSION_ANSWERS_KEY);
        this.sessionAnswers = stored ? JSON.parse(stored) : {};

        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
                if (docSnap.exists() && docSnap.data().sessionAnswers) {
                    this.sessionAnswers = JSON.parse(docSnap.data().sessionAnswers);
                }
            } catch (e) {
                console.error("Error loading session data:", e);
            }
        }
    }

    async saveWronglyAnsweredQuestions() {
        localStorage.setItem(this.LS_WRONG_ANSWERS_KEY, JSON.stringify([...this.wronglyAnsweredQuestions]));
        
        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                await window.setDoc(getUserDocRef(window.currentUserId), {
                    wronglyAnswered: JSON.stringify([...this.wronglyAnsweredQuestions]),
                    lastUpdated: new Date()
                }, { merge: true });
            } catch (e) {
                console.error("Error saving wrong answers:", e);
            }
        }
    }

    async loadWronglyAnsweredQuestions() {
        const stored = localStorage.getItem(this.LS_WRONG_ANSWERS_KEY);
        this.wronglyAnsweredQuestions = stored ? new Set(JSON.parse(stored)) : new Set();

        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
                if (docSnap.exists() && docSnap.data().wronglyAnswered) {
                    this.wronglyAnsweredQuestions = new Set(JSON.parse(docSnap.data().wronglyAnswered));
                }
            } catch (e) {
                console.error("Error loading wrong answers:", e);
            }
        }
    }

    updateQuizStats() {
        if (!this.allQuizQuestions.length) return;
        
        let wrong = 0, correct = 0, unanswered = 0;
        
        this.allQuizQuestions.forEach(q => {
            const status = this.sessionAnswers[q.QuestionText];
            if (status === 'correct') correct++;
            else if (status === 'wrong' || status === 'partial') wrong++;
            else unanswered++;
        });

        document.getElementById('wrong-count').textContent = wrong;
        document.getElementById('correct-count').textContent = correct;
        document.getElementById('unanswered-count').textContent = unanswered;
    }

    checkForCongratulations() {
        const panel = document.getElementById('congratulations-panel');
        const wrongAndUnanswered = this.getQuestionsToLoad();
        
        if (wrongAndUnanswered.length === 0 && this.allQuizQuestions.length > 0) {
            panel.style.display = 'block';
            return true;
        } else {
            panel.style.display = 'none';
            return false;
        }
    }

    // Event handlers
    handleTimerToggle() {
        this.saveSettings();
        if (this.elements.enableTimerCheckbox.checked && this.elements.quizForm.querySelector('.submit-btn').style.display !== 'none') {
            this.startTimer();
        } else if (!this.elements.enableTimerCheckbox.checked) {
            clearInterval(this.timerInterval);
            this.elements.timerDisplay.style.display = 'none';
        }
    }

    handleTitleChange() {
        this.elements.quizTitleDisplay.textContent = this.elements.quizTitleInput.value || "Enhanced Exam Preparation Quiz";
        document.title = this.elements.quizTitleInput.value || "Enhanced Exam Preparation Quiz";
        this.saveSettings();
    }

    toggleQuizMode() {
        if (this.quizMode === 'retake') {
            this.quizMode = 'all';
            this.elements.toggleModeBtn.textContent = 'Show All Questions';
            this.elements.toggleModeBtn.classList.remove('active');
        } else {
            this.quizMode = 'retake';
            this.elements.toggleModeBtn.textContent = 'Retake Only Wrong/Unanswered';
            this.elements.toggleModeBtn.classList.add('active');
        }
        this.loadQuiz();
    }

    restartAllQuestions() {
        this.quizMode = 'all';
        this.elements.toggleModeBtn.textContent = 'Show All Questions';
        this.elements.toggleModeBtn.classList.remove('active');
        this.loadQuiz();
    }

    async clearSessionData() {
        this.sessionAnswers = {};
        localStorage.removeItem(this.LS_SESSION_ANSWERS_KEY);
        
        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                await window.updateDoc(getUserDocRef(window.currentUserId), {
                    sessionAnswers: JSON.stringify({})
                });
            } catch (e) {
                console.error("Error clearing session data:", e);
            }
        }
        
        this.elements.errorMessageDiv.textContent = 'Session data cleared!';
        setTimeout(() => this.elements.errorMessageDiv.textContent = '', 3000);
        this.updateQuizStats();
    }

    async clearWrongAnswersHistory() {
        this.wronglyAnsweredQuestions.clear();
        localStorage.removeItem(this.LS_WRONG_ANSWERS_KEY);
        
        if (window.isFirebaseReady && window.db && window.currentUserId) {
            try {
                await window.updateDoc(getUserDocRef(window.currentUserId), {
                    wronglyAnswered: JSON.stringify([])
                });
            } catch (e) {
                console.error("Error clearing wrong answers:", e);
            }
        }
        
        this.elements.errorMessageDiv.textContent = 'Wrong answers history cleared!';
        setTimeout(() => this.elements.errorMessageDiv.textContent = '', 3000);
        this.updateQuizStats();
    }

    async initialize() {
        await this.loadSessionData();
        await this.loadWronglyAnsweredQuestions();
        await this.loadSettings();
        this.loadQuiz();
    }
}

// Initialize the quiz app
const quizApp = new QuizApp();

// Global function for Firebase to call when ready
window.initializeQuiz = () => {
    quizApp.initialize();
};

// Initialize immediately if Firebase is already ready
if (window.isFirebaseReady) {
    quizApp.initialize();
}

// Make quiz app available globally for debugging
window.quizApp = quizApp;