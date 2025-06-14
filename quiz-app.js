/* --- MAIN QUIZ APPLICATION LOGIC --- */

// Global variables
let allQuizQuestions = [];
let currentQuizQuestions = [];
let wronglyAnsweredQuestions = new Set();
let sessionAnswers = {};
let quizMode = 'retake';
let timerInterval;
let timeRemaining;

// Drag and drop variables
let draggedElement = null;
let touchStartPosition = null;
let touchClone = null;

// DOM element references
let quizForm, questionsContainer, scoreContainer, errorMessageDiv;
let numQuestionsInput, enableTimerCheckbox, timeLimitMinutesInput, quizTitleInput, quizTitleDisplay;
let timerDisplay;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDOMReferences();
});

// Function called by Firebase when ready
window.loadSettingsAndQuiz = async function() {
    if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
        console.warn("Firebase not ready yet, deferring quiz load.");
        document.getElementById('error-message').textContent = 'Waiting for authentication...';
        return;
    }
    document.getElementById('error-message').textContent = '';

    await loadSessionData();
    await loadWronglyAnsweredQuestions();
    await loadSettings();
    loadQuiz();
};

function initializeDOMReferences() {
    quizForm = document.getElementById('quiz-form');
    questionsContainer = document.getElementById('questions-container');
    scoreContainer = document.getElementById('score-container');
    errorMessageDiv = document.getElementById('error-message');
    numQuestionsInput = document.getElementById('num-questions');
    enableTimerCheckbox = document.getElementById('enable-timer-checkbox');
    timeLimitMinutesInput = document.getElementById('time-limit-minutes');
    quizTitleInput = document.getElementById('quiz-title-input');
    quizTitleDisplay = document.getElementById('quiz-title-display');
    timerDisplay = document.getElementById('timer-display');
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Parses CSV text into an array of objects
 */
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    const requiredHeaders = ["QuestionNumber", "QuestionText", "OptionA", "OptionB", "OptionC", "OptionD", "Answer 1", "Explanation"];
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

        // Process question type
        questionObj.Type = questionObj.Type || 'choice';
        questionObj.isSequence = questionObj.Type === 'sequence';

        // Process answers
        questionObj.correctAnswers = [];
        ['Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Answer 5'].forEach(key => {
            if (questionObj[key] && questionObj[key].trim()) {
                questionObj.correctAnswers.push(questionObj[key].trim());
            }
        });

        if (questionObj.isSequence) {
            questionObj.correctOrder = questionObj.correctAnswers.map(answer => parseInt(answer.trim()));
            questionObj.sequenceOptions = [];
            ['OptionA', 'OptionB', 'OptionC', 'OptionD', 'OptionE'].forEach((optionKey, index) => {
                if (questionObj[optionKey] && questionObj[optionKey].trim()) {
                    questionObj.sequenceOptions.push({
                        id: index + 1,
                        text: questionObj[optionKey].trim()
                    });
                }
            });
        } else {
            questionObj.isMultipleChoice = questionObj.correctAnswers.length > 1;
        }

        return questionObj;
    }).filter(row => row !== null);
}

/**
 * Creates HTML for a single question
 */
function createQuestionElement(question, index) {
    if (question.isSequence) {
        return createSequenceQuestionElement(question, index);
    } else {
        return createChoiceQuestionElement(question, index);
    }
}

function createChoiceQuestionElement(question, index) {
    const options = {
        A: question.OptionA || '',
        B: question.OptionB || '',
        C: question.OptionC || '',
        D: question.OptionD || ''
    };

    const inputType = question.isMultipleChoice ? 'checkbox' : 'radio';
    const inputName = question.isMultipleChoice ? `q${index}[]` : `q${index}`;
    const questionTypeText = question.isMultipleChoice ? 
        '(Multiple answers possible - select all that apply)' : 
        '(Single answer)';

    return `
        <div class="question" data-question-index="${index}" data-question-type="choice">
          <div class="question-title">${index + 1}. ${question.QuestionText || 'No Question Text'}</div>
          <div class="question-type-indicator">${questionTypeText}</div>
          <div class="options">
            ${Object.entries(options).map(([key, value]) => `
              <label>
                <input type="${inputType}" name="${inputName}" value="${key}" /> <span>${key}. ${value}</span>
              </label>
            `).join('')}
          </div>
          <div class="result" id="result-q${index}"></div>
          <div class="explanation" id="explanation-q${index}"></div>
          <div class="question-actions">
            <button type="button" class="validate-btn" data-question-index="${index}">Validate Answer</button>
          </div>
        </div>
    `;
}

function createSequenceQuestionElement(question, index) {
    const shuffledOptions = [...question.sequenceOptions];
    shuffleArray(shuffledOptions);

    return `
        <div class="question" data-question-index="${index}" data-question-type="sequence">
          <div class="question-title">${index + 1}. ${question.QuestionText || 'No Question Text'}</div>
          <div class="question-type-indicator">(Drag and drop to arrange in correct order)</div>
          <div class="sequence-instructions">
            📋 Drag the items below to arrange them in the correct order. Touch and hold on mobile devices.
          </div>
          <div class="sequence-container" id="sequence-container-${index}">
            ${shuffledOptions.map((option, optionIndex) => `
              <div class="sequence-item" 
                   data-option-id="${option.id}" 
                   data-question-index="${index}"
                   draggable="true">
                <div class="item-number">${optionIndex + 1}</div>
                <div class="item-text">${option.text}</div>
              </div>
              <div class="drop-zone-indicator" data-position="${optionIndex + 1}"></div>
            `).join('')}
          </div>
          <div class="sequence-actions">
            <button type="button" class="reset-sequence-btn" data-question-index="${index}">Reset Order</button>
          </div>
          <div class="result" id="result-q${index}"></div>
          <div class="explanation" id="explanation-q${index}"></div>
          <div class="question-actions">
            <button type="button" class="validate-btn" data-question-index="${index}">Validate Answer</button>
          </div>
        </div>
    `;
}

/**
 * Initializes drag and drop functionality
 */
function initializeDragAndDrop() {
    document.querySelectorAll('.sequence-item').forEach(item => {
        // Desktop drag and drop
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);

        // Touch events for mobile
        item.addEventListener('touchstart', handleTouchStart, { passive: false });
        item.addEventListener('touchmove', handleTouchMove, { passive: false });
        item.addEventListener('touchend', handleTouchEnd, { passive: false });
    });

    // Reset button functionality
    document.querySelectorAll('.reset-sequence-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const questionIndex = this.getAttribute('data-question-index');
            resetSequenceOrder(questionIndex);
        });
    });
}

// Drag and drop event handlers
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.sequence-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    document.querySelectorAll('.drop-zone-indicator').forEach(zone => {
        zone.classList.remove('active');
    });
    draggedElement = null;
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    if (draggedElement !== this) {
        const container = this.parentNode;
        const draggedIndex = Array.from(container.children).indexOf(draggedElement);
        const targetIndex = Array.from(container.children).indexOf(this);

        if (draggedIndex < targetIndex) {
            container.insertBefore(draggedElement, this.nextSibling);
        } else {
            container.insertBefore(draggedElement, this);
        }
        
        updateSequenceNumbers(container);
    }

    this.classList.remove('drag-over');
    return false;
}

// Touch event handlers for mobile
function handleTouchStart(e) {
    touchStartPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
    };
    
    setTimeout(() => {
        if (touchStartPosition) {
            this.classList.add('touch-dragging');
            touchClone = this.cloneNode(true);
            touchClone.style.position = 'fixed';
            touchClone.style.zIndex = '1000';
            touchClone.style.pointerEvents = 'none';
            touchClone.style.opacity = '0.8';
            touchClone.style.transform = 'scale(1.05)';
            document.body.appendChild(touchClone);
            draggedElement = this;
        }
    }, 100);
}

function handleTouchMove(e) {
    e.preventDefault();
    
    if (!touchStartPosition || !touchClone) return;

    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - 50) + 'px';
    touchClone.style.top = (touch.clientY - 25) + 'px';

    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const sequenceItem = elementBelow?.closest('.sequence-item');
    
    document.querySelectorAll('.sequence-item').forEach(item => {
        item.classList.remove('drag-over');
    });

    if (sequenceItem && sequenceItem !== draggedElement) {
        sequenceItem.classList.add('drag-over');
    }
}

function handleTouchEnd(e) {
    if (!touchStartPosition || !draggedElement) return;

    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetItem = elementBelow?.closest('.sequence-item');

    if (targetItem && targetItem !== draggedElement) {
        const container = draggedElement.parentNode;
        const draggedIndex = Array.from(container.children).filter(child => child.classList.contains('sequence-item')).indexOf(draggedElement);
        const targetIndex = Array.from(container.children).filter(child => child.classList.contains('sequence-item')).indexOf(targetItem);

        if (draggedIndex < targetIndex) {
            container.insertBefore(draggedElement, targetItem.nextSibling);
        } else {
            container.insertBefore(draggedElement, targetItem);
        }
        
        updateSequenceNumbers(container);
    }

    // Cleanup
    if (touchClone) {
        document.body.removeChild(touchClone);
        touchClone = null;
    }
    
    draggedElement?.classList.remove('touch-dragging');
    document.querySelectorAll('.sequence-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    touchStartPosition = null;
    draggedElement = null;
}

function updateSequenceNumbers(container) {
    const items = container.querySelectorAll('.sequence-item');
    items.forEach((item, index) => {
        const numberElement = item.querySelector('.item-number');
        if (numberElement) {
            numberElement.textContent = index + 1;
        }
    });
}

function resetSequenceOrder(questionIndex) {
    const question = currentQuizQuestions[questionIndex];
    const container = document.getElementById(`sequence-container-${questionIndex}`);
    
    const items = Array.from(container.querySelectorAll('.sequence-item'));
    shuffleArray(items);
    
    container.innerHTML = '';
    items.forEach((item, index) => {
        item.classList.remove('correct', 'incorrect', 'drag-over', 'touch-dragging');
        
        const numberElement = item.querySelector('.item-number');
        if (numberElement) {
            numberElement.textContent = index + 1;
        }
        
        container.appendChild(item);
        
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone-indicator';
        dropZone.setAttribute('data-position', index + 1);
        container.appendChild(dropZone);
    });
    
    const resultElement = document.getElementById(`result-q${questionIndex}`);
    const explanationElement = document.getElementById(`explanation-q${questionIndex}`);
    if (resultElement) {
        resultElement.textContent = '';
        resultElement.className = 'result';
    }
    if (explanationElement) {
        explanationElement.textContent = '';
        explanationElement.style.display = 'none';
    }
    
    initializeDragAndDrop();
}

/**
 * Validates a single question
 */
function validateSingleQuestion(index) {
    const question = currentQuizQuestions[index];
    
    if (question.isSequence) {
        return validateSequenceQuestion(index);
    } else {
        return validateChoiceQuestion(index);
    }
}

function validateChoiceQuestion(index) {
    const question = currentQuizQuestions[index];
    const questionDiv = document.querySelector(`.question[data-question-index="${index}"]`);
    const resultElement = document.getElementById(`result-q${index}`);
    const explanationElement = document.getElementById(`explanation-q${index}`);
    const questionText = question.QuestionText;

    // Clear previous feedback
    resultElement.textContent = '';
    resultElement.className = 'result';
    explanationElement.textContent = '';
    explanationElement.style.display = 'none';

    questionDiv.querySelectorAll('label').forEach(label => {
        label.style.backgroundColor = '';
        label.style.border = '1px solid #e0e0e0';
    });

    let selectedAnswers = [];
    if (question.isMultipleChoice) {
        const selectedOptions = quizForm.querySelectorAll(`input[name="q${index}[]"]:checked`);
        selectedAnswers = Array.from(selectedOptions).map(option => option.value);
    } else {
        const selectedOption = quizForm.querySelector(`input[name="q${index}"]:checked`);
        if (selectedOption) {
            selectedAnswers = [selectedOption.value];
        }
    }

    if (selectedAnswers.length === 0) {
        resultElement.textContent = 'Please select an answer for this question.';
        resultElement.classList.add('wrong');
        sessionAnswers[questionText] = 'unanswered';
        saveSessionData();
        updateQuizStats();
        return 'unanswered';
    }

    const correctAnswers = question.correctAnswers;
    const selectedSet = new Set(selectedAnswers);
    const correctSet = new Set(correctAnswers);

    const isExactMatch = selectedSet.size === correctSet.size && 
                        [...selectedSet].every(answer => correctSet.has(answer));

    const correctSelected = selectedAnswers.filter(answer => correctSet.has(answer));
    const incorrectSelected = selectedAnswers.filter(answer => !correctSet.has(answer));

    let result;
    if (isExactMatch) {
        resultElement.textContent = 'Correct! 🎉';
        resultElement.classList.add('correct');
        selectedAnswers.forEach(answer => {
            const answerInput = quizForm.querySelector(`input[name="${question.isMultipleChoice ? `q${index}[]` : `q${index}`}"][value="${answer}"]`);
            if (answerInput) {
                answerInput.parentElement.style.backgroundColor = '#e6ffe6';
                answerInput.parentElement.style.border = '1px solid #27ae60';
            }
        });
        wronglyAnsweredQuestions.delete(questionText);
        saveWronglyAnsweredQuestions();
        sessionAnswers[questionText] = 'correct';
        result = 'correct';
    } else if (correctSelected.length > 0 && question.isMultipleChoice) {
        resultElement.textContent = `Partial Credit! You got ${correctSelected.length} out of ${correctAnswers.length} correct. Correct answers: ${correctAnswers.join(', ')}`;
        resultElement.classList.add('partial');
        
        correctSelected.forEach(answer => {
            const answerInput = quizForm.querySelector(`input[name="q${index}[]"][value="${answer}"]`);
            if (answerInput) {
                answerInput.parentElement.style.backgroundColor = '#e6ffe6';
                answerInput.parentElement.style.border = '1px solid #27ae60';
            }
        });
        incorrectSelected.forEach(answer => {
            const answerInput = quizForm.querySelector(`input[name="q${index}[]"][value="${answer}"]`);
            if (answerInput) {
                answerInput.parentElement.style.backgroundColor = '#ffe6e6';
                answerInput.parentElement.style.border = '1px solid #e74c3c';
            }
        });

        wronglyAnsweredQuestions.add(questionText);
        saveWronglyAnsweredQuestions();
        sessionAnswers[questionText] = 'partial';
        result = 'partial';
    } else {
        resultElement.textContent = `Wrong! The correct answer${correctAnswers.length > 1 ? 's' : ''}: ${correctAnswers.join(', ')}`;
        resultElement.classList.add('wrong');
        
        selectedAnswers.forEach(answer => {
            const answerInput = quizForm.querySelector(`input[name="${question.isMultipleChoice ? `q${index}[]` : `q${index}`}"][value="${answer}"]`);
            if (answerInput) {
                answerInput.parentElement.style.backgroundColor = '#ffe6e6';
                answerInput.parentElement.style.border = '1px solid #e74c3c';
            }
        });

        wronglyAnsweredQuestions.add(questionText);
        saveWronglyAnsweredQuestions();
        sessionAnswers[questionText] = 'wrong';
        result = 'wrong';
    }

    // Show correct answers
    correctAnswers.forEach(answer => {
        const correctInput = quizForm.querySelector(`input[name="${question.isMultipleChoice ? `q${index}[]` : `q${index}`}"][value="${answer}"]`);
        if (correctInput && !selectedSet.has(answer)) {
            correctInput.parentElement.style.backgroundColor = '#d4edda';
            correctInput.parentElement.style.border = '1px solid #27ae60';
        }
    });

    // Display explanation
    if (question.Explanation && question.Explanation.trim()) {
        explanationElement.textContent = `Explanation: ${question.Explanation}`;
        explanationElement.style.display = 'block';
    }

    saveSessionData();
    updateQuizStats();
    return result;
}

function validateSequenceQuestion(index) {
    const question = currentQuizQuestions[index];
    const container = document.getElementById(`sequence-container-${index}`);
    const resultElement = document.getElementById(`result-q${index}`);
    const explanationElement = document.getElementById(`explanation-q${index}`);
    const questionText = question.QuestionText;

    // Clear previous feedback
    resultElement.textContent = '';
    resultElement.className = 'result';
    explanationElement.textContent = '';
    explanationElement.style.display = 'none';

    // Get current order
    const items = container.querySelectorAll('.sequence-item');
    const userOrder = Array.from(items).map(item => parseInt(item.getAttribute('data-option-id')));
    const correctOrder = question.correctOrder;
    
    if (userOrder.length === 0) {
        resultElement.textContent = 'Please arrange the items in order.';
        resultElement.classList.add('wrong');
        sessionAnswers[questionText] = 'unanswered';
        saveSessionData();
        updateQuizStats();
        return 'unanswered';
    }

    // Calculate score
    let correctPositions = 0;
    let partialScore = 0;

    items.forEach((item, position) => {
        const optionId = parseInt(item.getAttribute('data-option-id'));
        const correctPosition = correctOrder.indexOf(optionId);
        
        item.classList.remove('correct', 'incorrect');
        
        if (correctPosition === position) {
            correctPositions++;
            item.classList.add('correct');
        } else {
            item.classList.add('incorrect');
            const distance = Math.abs(correctPosition - position);
            if (distance <= 1) partialScore += 0.5;
        }
    });

    const totalItems = correctOrder.length;
    const exactMatch = correctPositions === totalItems;
    const hasPartialCredit = partialScore > 0 || correctPositions > 0;

    let result;
    if (exactMatch) {
        resultElement.textContent = 'Perfect! Correct sequence! 🎉';
        resultElement.classList.add('correct');
        wronglyAnsweredQuestions.delete(questionText);
        saveWronglyAnsweredQuestions();
        sessionAnswers[questionText] = 'correct';
        result = 'correct';
    } else if (hasPartialCredit) {
        const score = Math.round(((correctPositions + partialScore) / totalItems) * 100);
        resultElement.textContent = `Partial Credit: ${correctPositions}/${totalItems} in exact position (${score}% score)`;
        resultElement.classList.add('partial');
        wronglyAnsweredQuestions.add(questionText);
        saveWronglyAnsweredQuestions();
        sessionAnswers[questionText] = 'partial';
        result = 'partial';
    } else {
        resultElement.textContent = 'Incorrect sequence. Try again!';
        resultElement.classList.add('wrong');
        wronglyAnsweredQuestions.add(questionText);
        saveWronglyAnsweredQuestions();
        sessionAnswers[questionText] = 'wrong';
        result = 'wrong';
    }

    // Show explanation
    if (question.Explanation && question.Explanation.trim()) {
        explanationElement.textContent = `Explanation: ${question.Explanation}`;
        explanationElement.style.display = 'block';
    } else {
        const correctSequence = correctOrder.map(pos => {
            const option = question.sequenceOptions.find(opt => opt.id === pos);
            return option ? option.text : '';
        }).filter(text => text);
        
        explanationElement.textContent = `Correct order: ${correctSequence.map((text, i) => `${i + 1}. ${text}`).join(' → ')}`;
        explanationElement.style.display = 'block';
    }

    saveSessionData();
    updateQuizStats();
    return result;
}

/**
 * Timer functions
 */
function startTimer() {
    const enableTimer = enableTimerCheckbox.checked;
    const timeLimitMinutes = parseInt(timeLimitMinutesInput.value);

    clearInterval(timerInterval);

    if (enableTimer && !isNaN(timeLimitMinutes) && timeLimitMinutes > 0) {
        timeRemaining = timeLimitMinutes * 60;
        timerDisplay.style.display = 'block';
        updateTimerDisplay();

        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = 'Time Up!';
                quizForm.dispatchEvent(new Event('submit'));
            }
        }, 1000);
    } else {
        timerDisplay.style.display = 'none';
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplay.textContent = `Time Remaining: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeRemaining <= 30 && timeRemaining > 0) {
        timerDisplay.style.color = '#ff6347';
    } else if (timeRemaining <= 0) {
        timerDisplay.style.color = '#c0392b';
    } else {
        timerDisplay.style.color = '#e74c3c';
    }
}

/**
 * Firebase data operations
 */
function getUserDocRef(userId) {
    const appId = window.firebaseConfig.projectId;
    return window.doc(window.db, 'artifacts', appId, 'users', userId, 'quizData', 'userSettings');
}

async function loadSettings() {
    if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
        loadSettingsFromLocalStorage();
        return;
    }

    try {
        const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            numQuestionsInput.value = data.numQuestions || '';
            enableTimerCheckbox.checked = data.enableTimer || false;
            timeLimitMinutesInput.value = data.timeLimitMinutes || 10;
            quizTitleInput.value = data.quizTitle || "General Exam Preparation Quiz";

            quizTitleDisplay.textContent = quizTitleInput.value;
            document.title = quizTitleInput.value;
        } else {
            loadSettingsFromLocalStorage();
        }
    } catch (e) {
        console.error("Error loading settings:", e);
        loadSettingsFromLocalStorage();
    }
}

async function saveSettings() {
    if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
        saveSettingsToLocalStorage();
        return;
    }

    const settingsData = {
        numQuestions: numQuestionsInput.value || 'all',
        enableTimer: enableTimerCheckbox.checked,
        timeLimitMinutes: parseInt(timeLimitMinutesInput.value) || 10,
        quizTitle: quizTitleInput.value || "General Exam Preparation Quiz",
        lastUpdated: new Date()
    };
    
    try {
        await window.setDoc(getUserDocRef(window.currentUserId), settingsData, { merge: true });
    } catch (e) {
        console.error("Error saving settings:", e);
        saveSettingsToLocalStorage();
    }
}

async function loadSessionData() {
    if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
        loadSessionDataFromLocalStorage();
        return;
    }

    try {
        const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
        if (docSnap.exists() && docSnap.data().sessionAnswers) {
            sessionAnswers = JSON.parse(docSnap.data().sessionAnswers);
        } else {
            sessionAnswers = {};
        }
    } catch (e) {
        console.error("Error loading session data:", e);
        loadSessionDataFromLocalStorage();
    }
}

async function saveSessionData() {
    if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
        saveSessionDataToLocalStorage();
        return;
    }

    try {
        await window.setDoc(getUserDocRef(window.currentUserId), {
            sessionAnswers: JSON.stringify(sessionAnswers),
            lastUpdated: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Error saving session data:", e);
        saveSessionDataToLocalStorage();
    }
}

async function loadWronglyAnsweredQuestions() {
    if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
        loadWronglyAnsweredQuestionsFromLocalStorage();
        return;
    }

    try {
        const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
        if (docSnap.exists() && docSnap.data().wronglyAnswered) {
            wronglyAnsweredQuestions = new Set(JSON.parse(docSnap.data().wronglyAnswered));
        } else {
            wronglyAnsweredQuestions = new Set();
        }
    } catch (e) {
        console.error("Error loading wrong answers:", e);
        loadWronglyAnsweredQuestionsFromLocalStorage();
    }
}

async function saveWronglyAnsweredQuestions() {
    if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
        saveWronglyAnsweredQuestionsToLocalStorage();
        return;
    }

    try {
        await window.setDoc(getUserDocRef(window.currentUserId), {
            wronglyAnswered: JSON.stringify(Array.from(wronglyAnsweredQuestions)),
            lastUpdated: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Error saving wrong answers:", e);
        saveWronglyAnsweredQuestionsToLocalStorage();
    }
}

async function clearSessionData() {
    sessionAnswers = {};
    if (window.isFirebaseReady && window.db && window.currentUserId) {
        try {
            await window.updateDoc(getUserDocRef(window.currentUserId), {
                sessionAnswers: JSON.stringify({})
            });
            errorMessageDiv.textContent = 'Session data cleared!';
            setTimeout(() => errorMessageDiv.textContent = '', 3000);
        } catch (e) {
            console.error("Error clearing session data:", e);
        }
    }
    clearSessionDataLocalStorage();
    updateQuizStats();
}

async function clearWronglyAnsweredQuestions() {
    wronglyAnsweredQuestions.clear();
    if (window.isFirebaseReady && window.db && window.currentUserId) {
        try {
            await window.updateDoc(getUserDocRef(window.currentUserId), {
                wronglyAnswered: JSON.stringify([])
            });
            errorMessageDiv.textContent = 'Wrong answers history cleared!';
            setTimeout(() => errorMessageDiv.textContent = '', 3000);
        } catch (e) {
            console.error("Error clearing wrong answers:", e);
        }
    }
    clearWronglyAnsweredQuestionsLocalStorage();
    updateQuizStats();
}

// Local storage fallback functions
function loadSettingsFromLocalStorage() {
    const settings = JSON.parse(localStorage.getItem('quizSettings') || '{}');
    numQuestionsInput.value = settings.numQuestions || '';
    enableTimerCheckbox.checked = settings.enableTimer || false;
    timeLimitMinutesInput.value = settings.timeLimitMinutes || 10;
    quizTitleInput.value = settings.quizTitle || "General Exam Preparation Quiz";
    quizTitleDisplay.textContent = quizTitleInput.value;
    document.title = quizTitleInput.value;
}

function saveSettingsToLocalStorage() {
    const settings = {
        numQuestions: numQuestionsInput.value || 'all',
        enableTimer: enableTimerCheckbox.checked,
        timeLimitMinutes: parseInt(timeLimitMinutesInput.value) || 10,
        quizTitle: quizTitleInput.value || "General Exam Preparation Quiz"
    };
    localStorage.setItem('quizSettings', JSON.stringify(settings));
}

function loadSessionDataFromLocalStorage() {
    sessionAnswers = JSON.parse(localStorage.getItem('quizSessionAnswers') || '{}');
}

function saveSessionDataToLocalStorage() {
    localStorage.setItem('quizSessionAnswers', JSON.stringify(sessionAnswers));
}

function clearSessionDataLocalStorage() {
    localStorage.removeItem('quizSessionAnswers');
    sessionAnswers = {};
}

function loadWronglyAnsweredQuestionsFromLocalStorage() {
    wronglyAnsweredQuestions = new Set(JSON.parse(localStorage.getItem('quizWrongAnswers') || '[]'));
}

function saveWronglyAnsweredQuestionsToLocalStorage() {
    localStorage.setItem('quizWrongAnswers', JSON.stringify(Array.from(wronglyAnsweredQuestions)));
}

function clearWronglyAnsweredQuestionsLocalStorage() {
    localStorage.removeItem('quizWrongAnswers');
    wronglyAnsweredQuestions.clear();
}

/**
 * Quiz management functions
 */
function updateQuizStats() {
    let wrongCount = 0;
    let correctCount = 0;
    let unansweredCount = 0;

    if (allQuizQuestions.length === 0) return;

    allQuizQuestions.forEach(question => {
        const questionText = question.QuestionText;
        const sessionAnswer = sessionAnswers[questionText];
        
        if (wronglyAnsweredQuestions.has(questionText) || sessionAnswer === 'wrong' || sessionAnswer === 'partial') {
            wrongCount++;
        } else if (sessionAnswer === 'correct') {
            correctCount++;
        } else {
            unansweredCount++;
        }
    });

    document.getElementById('wrong-count').textContent = wrongCount;
    document.getElementById('correct-count').textContent = correctCount;
    document.getElementById('unanswered-count').textContent = unansweredCount;

    // Show congratulations if all questions are correct
    if (wrongCount === 0 && unansweredCount === 0 && allQuizQuestions.length > 0) {
        document.getElementById('congratulations-panel').style.display = 'block';
    } else {
        document.getElementById('congratulations-panel').style.display = 'none';
    }
}

function loadQuiz() {
    fetch('questions.csv')
        .then(response => response.text())
        .then(csvText => {
            try {
                allQuizQuestions = parseCSV(csvText);
                console.log(`Loaded ${allQuizQuestions.length} questions from CSV.`);
                
                if (allQuizQuestions.length === 0) {
                    throw new Error('No valid questions found in CSV file.');
                }
                
                updateQuizStats();
                setupQuizInterface();
                generateQuiz();
            } catch (error) {
                console.error('Error parsing CSV:', error);
                errorMessageDiv.textContent = `Error loading questions: ${error.message}`;
            }
        })
        .catch(error => {
            console.error('Error loading CSV file:', error);
            errorMessageDiv.textContent = 'Error: Could not load questions.csv. Please ensure the file exists.';
        });
}

function setupQuizInterface() {
    // Event listeners
    document.getElementById('toggle-mode-btn').addEventListener('click', toggleQuizMode);
    document.getElementById('restart-all-btn').addEventListener('click', restartWithAllQuestions);
    document.getElementById('clear-wrong-answers-btn').addEventListener('click', clearWronglyAnsweredQuestions);
    document.getElementById('clear-session-data-btn').addEventListener('click', clearSessionData);
    document.getElementById('retake-quiz-btn').addEventListener('click', retakeQuiz);
    
    // Settings change listeners
    numQuestionsInput.addEventListener('change', saveSettings);
    enableTimerCheckbox.addEventListener('change', saveSettings);
    timeLimitMinutesInput.addEventListener('change', saveSettings);
    quizTitleInput.addEventListener('input', function() {
        quizTitleDisplay.textContent = this.value || 'Exam Preparation Quiz';
        document.title = this.value || 'Exam Preparation Quiz';
        saveSettings();
    });

    // Form submission
    quizForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitQuiz();
    });

    // Individual question validation
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('validate-btn')) {
            const questionIndex = parseInt(e.target.getAttribute('data-question-index'));
            validateSingleQuestion(questionIndex);
        }
    });
}

function generateQuiz() {
    let questionsToShow = [];

    if (quizMode === 'retake') {
        questionsToShow = allQuizQuestions.filter(question => {
            const questionText = question.QuestionText;
            const sessionAnswer = sessionAnswers[questionText];
            return wronglyAnsweredQuestions.has(questionText) || 
                   sessionAnswer === 'wrong' || 
                   sessionAnswer === 'partial' || 
                   sessionAnswer === 'unanswered' || 
                   !sessionAnswer;
        });
    } else {
        questionsToShow = [...allQuizQuestions];
    }

    // Limit number of questions if specified
    const numQuestions = parseInt(numQuestionsInput.value);
    if (!isNaN(numQuestions) && numQuestions > 0) {
        shuffleArray(questionsToShow);
        questionsToShow = questionsToShow.slice(0, numQuestions);
    } else {
        shuffleArray(questionsToShow);
    }

    currentQuizQuestions = questionsToShow;

    if (currentQuizQuestions.length === 0) {
        questionsContainer.innerHTML = '<p>No questions available for this mode.</p>';
        return;
    }

    // Generate HTML for questions
    const questionsHTML = currentQuizQuestions.map((question, index) => 
        createQuestionElement(question, index)
    ).join('');

    questionsContainer.innerHTML = questionsHTML;
    initializeDragAndDrop();
    enableQuizInputs();
    startTimer();

    console.log(`Generated quiz with ${currentQuizQuestions.length} questions in ${quizMode} mode.`);
}

function toggleQuizMode() {
    const toggleBtn = document.getElementById('toggle-mode-btn');
    if (quizMode === 'retake') {
        quizMode = 'all';
        toggleBtn.textContent = 'Show All Questions';
        toggleBtn.classList.remove('active');
    } else {
        quizMode = 'retake';
        toggleBtn.textContent = 'Retake Only Wrong/Unanswered';
        toggleBtn.classList.add('active');
    }
    generateQuiz();
}

function restartWithAllQuestions() {
    quizMode = 'all';
    document.getElementById('toggle-mode-btn').textContent = 'Show All Questions';
    document.getElementById('toggle-mode-btn').classList.remove('active');
    document.getElementById('congratulations-panel').style.display = 'none';
    generateQuiz();
}

function retakeQuiz() {
    generateQuiz();
}

function submitQuiz() {
    let totalQuestions = currentQuizQuestions.length;
    let correctAnswers = 0;
    let partialCredit = 0;

    // Validate all questions
    for (let i = 0; i < totalQuestions; i++) {
        const result = validateSingleQuestion(i);
        if (result === 'correct') {
            correctAnswers++;
        } else if (result === 'partial') {
            partialCredit += 0.5;
        }
    }

    const totalScore = correctAnswers + partialCredit;
    const percentage = Math.round((totalScore / totalQuestions) * 100);

    scoreContainer.innerHTML = `
        <div>Your Score: ${totalScore}/${totalQuestions} (${percentage}%)</div>
        <div style="font-size: 0.9em; margin-top: 10px;">
            Correct: ${correctAnswers} | Partial Credit: ${partialCredit} | Wrong: ${totalQuestions - correctAnswers - partialCredit}
        </div>
    `;

    disableQuizInputs();
    updateQuizStats();
}

function disableQuizInputs() {
    clearInterval(timerInterval);
    quizForm.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.disabled = true;
    });
    quizForm.querySelectorAll('.sequence-item').forEach(item => {
        item.draggable = false;
        item.style.cursor = 'not-allowed';
        item.style.opacity = '0.7';
    });
    quizForm.querySelector('.submit-btn').style.display = 'none';
    quizForm.querySelectorAll('.validate-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.style.cursor = 'not-allowed';
    });
    quizForm.querySelectorAll('.reset-sequence-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.style.cursor = 'not-allowed';
    });
    document.getElementById('retake-quiz-btn').style.display = 'block';
}

function enableQuizInputs() {
    clearInterval(timerInterval);
    timerDisplay.style.display = 'none';

    quizForm.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.disabled = false;
        input.checked = false;
    });
    quizForm.querySelectorAll('.sequence-item').forEach(item => {
        item.draggable = true;
        item.style.cursor = 'move';
        item.style.opacity = '1';
    });
    quizForm.querySelector('.submit-btn').style.display = 'block';
    quizForm.querySelectorAll('.validate-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.style.cursor = 'pointer';
    });
    quizForm.querySelectorAll('.reset-sequence-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.style.cursor = 'pointer';
    });
    document.getElementById('retake-quiz-btn').style.display = 'none';
    scoreContainer.textContent = '';
    errorMessageDiv.textContent = '';

    // Clear all question feedback
    document.querySelectorAll('.question').forEach(qDiv => {
        qDiv.querySelector('.result').textContent = '';
        qDiv.querySelector('.result').className = 'result';
        qDiv.querySelector('.explanation').textContent = '';
        qDiv.querySelector('.explanation').style.display = 'none';
        qDiv.querySelectorAll('label').forEach(label => {
            label.style.backgroundColor = '';
            label.style.border = '1px solid #e0e0e0';
        });
        qDiv.querySelectorAll('.sequence-item').forEach(item => {
            item.classList.remove('correct', 'incorrect', 'drag-over', 'touch-dragging');
        });
    });
}