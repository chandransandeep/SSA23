// Load session data from Firestore
    async function loadSessionData() {
        if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
            console.log("Firebase not ready for loading session data.");
            loadSessionDataFromLocalStorage();
            return;
        }

        try {
            const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
            if (docSnap.exists() && docSnap.data().sessionAnswers) {
                sessionAnswers = JSON.parse(docSnap.data().sessionAnswers);
                console.log("Session data loaded from Firestore.");
            } else {
                console.log("No session data found in Firestore. Using empty object.");
                sessionAnswers = {};
            }
        } catch (e) {
            console.error("Error loading session data from Firestore: ", e);
            loadSessionDataFromLocalStorage();
        }
    }

    // Save session data to Firestore
    async function saveSessionData() {
        if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
            console.warn("Firebase not ready for saving session data. Saving to local storage instead.");
            saveSessionDataToLocalStorage();
            return;
        }

        try {
            await window.setDoc(getUserDocRef(window.currentUserId), {
                sessionAnswers: JSON.stringify(sessionAnswers),
                lastUpdated: new Date()
            }, { merge: true });
            console.log("Session data saved to Firestore.");
        } catch (e) {
            console.error("Error saving session data to Firestore: ", e);
            saveSessionDataToLocalStorage();
        }
    }

    // Clear session data
    async function clearSessionData() {
        sessionAnswers = {};
        if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
            console.warn("Firebase not ready for clearing session data. Clearing local storage instead.");
            clearSessionDataLocalStorage();
            return;
        }

        try {
            await window.updateDoc(getUserDocRef(window.currentUserId), {
                sessionAnswers: JSON.stringify({})
            });
            console.log("Session data cleared from Firestore.");
            errorMessageDiv.textContent = 'Session data cleared!';
            setTimeout(() => errorMessageDiv.textContent = '', 3000);
        } catch (e) {
            console.error("Error clearing session data from Firestore: ", e);
            clearSessionDataLocalStorage();
        }
        updateQuizStats();
    }

    // Load wrong answers from Firestore
    async function loadWronglyAnsweredQuestions() {
        if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
            console.log("Firebase not ready for loading wrong answers.");
            loadWronglyAnsweredQuestionsFromLocalStorage();
            return;
        }

        try {
            const docSnap = await window.getDoc(getUserDocRef(window.currentUserId));
            if (docSnap.exists() && docSnap.data().wronglyAnswered) {
                wronglyAnsweredQuestions = new Set(JSON.parse(docSnap.data().wronglyAnswered));
                console.log("Wrong answers loaded from Firestore.");
            } else {
                console.log("No wrong answers found in Firestore. Using empty set.");
                wronglyAnsweredQuestions = new Set();
            }
        } catch (e) {
            console.error("Error loading wrong answers from Firestore: ", e);
            loadWronglyAnsweredQuestionsFromLocalStorage();
        }
    }

    // Save wrong answers to Firestore
    async function saveWronglyAnsweredQuestions() {
        if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
            console.warn("Firebase not ready for saving wrong answers. Saving to local storage instead.");
            saveWronglyAnsweredQuestionsToLocalStorage();
            return;
        }

        try {
            await window.setDoc(getUserDocRef(window.currentUserId), {
                wronglyAnswered: JSON.stringify(Array.from(wronglyAnsweredQuestions)),
                lastUpdated: new Date()
            }, { merge: true });
            console.log("Wrong answers saved to Firestore.");
        } catch (e) {
            console.error("Error saving wrong answers to Firestore: ", e);
            saveWronglyAnsweredQuestionsToLocalStorage();
        }
    }

    // Clear wrong answers
    async function clearWronglyAnsweredQuestions() {
        wronglyAnsweredQuestions.clear();
        if (!window.isFirebaseReady || !window.db || !window.currentUserId) {
            console.warn("Firebase not ready for clearing wrong answers. Clearing local storage instead.");
            clearWronglyAnsweredQuestionsLocalStorage();
            return;
        }

        try {
            await window.updateDoc(getUserDocRef(window.currentUserId), {
                wronglyAnswered: JSON.stringify([])
            });
            console.log("Wrong answers cleared from Firestore.");
            errorMessageDiv.textContent = 'Wrong answers history cleared!';
            setTimeout(() => errorMessageDiv.textContent = '', 3000);
        } catch (e) {
            console.error("Error clearing wrong answers from Firestore: ", e);
            clearWronglyAnsweredQuestionsLocalStorage();
        }
        updateQuizStats();
    }

    // Local Storage Fallback Functions
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

    // Quiz Management Functions
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

        // Show congratulations if all questions are answered correctly
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
        // Set up event listeners
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
            // Show only wrong/unanswered questions
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
            // Show all questions
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
        
        // Initialize drag and drop for sequence questions
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
                partialCredit += 0.5; // Give half credit for partial answers
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

    // Global references for DOM elements
    let quizForm, questionsContainer, scoreContainer, errorMessageDiv;
    let numQuestionsInput, enableTimerCheckbox, timeLimitMinutesInput, quizTitleInput, quizTitleDisplay;
    let timerDisplay;

    // Initialize DOM references
    document.addEventListener('DOMContentLoaded', function() {
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
    });

  </script>
</body>
</html>