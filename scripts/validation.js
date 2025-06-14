// Validation Engine for Different Question Types
export class ValidationEngine {
    constructor() {
        this.validators = {
            'multiple-choice': this.validateMultipleChoice.bind(this),
            'true-false': this.validateTrueFalse.bind(this),
            'text-input': this.validateTextInput.bind(this),
            'fill-blank': this.validateFillBlank.bind(this),
            'matching': this.validateMatching.bind(this)
        };
    }

    validateQuestion(question, index) {
        const questionDiv = document.querySelector(`.question[data-question-index="${index}"]`);
        const resultElement = document.getElementById(`result-q${index}`);
        const explanationElement = document.getElementById(`explanation-q${index}`);

        // Clear previous feedback
        this.clearPreviousFeedback(resultElement, explanationElement, questionDiv);

        // Validate based on question type
        const validator = this.validators[question.questionType] || this.validators['multiple-choice'];
        const result = validator(question, index, questionDiv, resultElement);

        // Show explanation if available
        this.showExplanation(question, explanationElement);

        return result;
    }

    clearPreviousFeedback(resultElement, explanationElement, questionDiv) {
        resultElement.textContent = '';
        resultElement.className = 'result';
        explanationElement.textContent = '';
        explanationElement.style.display = 'none';

        // Clear option highlighting
        questionDiv.querySelectorAll('label').forEach(label => {
            label.style.backgroundColor = '';
            label.style.border = '1px solid #e0e0e0';
        });

        // Clear input field highlighting
        questionDiv.querySelectorAll('.text-input, .blank-input').forEach(input => {
            input.style.backgroundColor = '';
            input.style.border = '';
        });

        // Clear drop zone highlighting
        questionDiv.querySelectorAll('.drop-zone').forEach(zone => {
            zone.style.backgroundColor = '';
        });
    }

    showExplanation(question, explanationElement) {
        if (question.Explanation && question.Explanation.trim()) {
            explanationElement.textContent = `Explanation: ${question.Explanation}`;
            explanationElement.style.display = 'block';
        }
    }

    validateMultipleChoice(question, index, questionDiv, resultElement) {
        const quizForm = document.getElementById('quiz-form');
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
            resultElement.textContent = 'Please select an answer.';
            resultElement.classList.add('wrong');
            return 'unanswered';
        }

        const correctAnswers = question.correctAnswers;
        const selectedSet = new Set(selectedAnswers);
        const correctSet = new Set(correctAnswers);

        // Check for exact match
        const isExactMatch = selectedSet.size === correctSet.size && 
                            [...selectedSet].every(answer => correctSet.has(answer));

        if (isExactMatch) {
            resultElement.textContent = 'Correct! 🎉';
            resultElement.classList.add('correct');
            this.highlightOptions(questionDiv, selectedAnswers, 'correct');
            return 'correct';
        } else {
            const correctSelected = selectedAnswers.filter(answer => correctSet.has(answer));
            const incorrectSelected = selectedAnswers.filter(answer => !correctSet.has(answer));
            
            if (correctSelected.length > 0 && question.isMultipleChoice) {
                resultElement.textContent = `Partial Credit! ${correctSelected.length}/${correctAnswers.length} correct.`;
                resultElement.classList.add('partial');
                this.highlightOptions(questionDiv, correctSelected, 'correct');
                this.highlightOptions(questionDiv, incorrectSelected, 'wrong');
                this.showCorrectAnswers(questionDiv, correctAnswers, selectedAnswers);
                return 'partial';
            } else {
                resultElement.textContent = `Wrong! Correct answer${correctAnswers.length > 1 ? 's' : ''}: ${correctAnswers.join(', ')}`;
                resultElement.classList.add('wrong');
                this.highlightOptions(questionDiv, selectedAnswers, 'wrong');
                this.showCorrectAnswers(questionDiv, correctAnswers, selectedAnswers);
                return 'wrong';
            }
        }
    }

    validateTrueFalse(question, index, questionDiv, resultElement) {
        const selected = document.getElementById(`tf-${index}`).value;
        
        if (!selected) {
            resultElement.textContent = 'Please select True or False.';
            resultElement.classList.add('wrong');
            return 'unanswered';
        }

        if (selected === question.correctAnswer) {
            resultElement.textContent = 'Correct! 🎉';
            resultElement.classList.add('correct');
            return 'correct';
        } else {
            resultElement.textContent = `Wrong! Correct answer: ${question.correctAnswer}`;
            resultElement.classList.add('wrong');
            return 'wrong';
        }
    }

    validateTextInput(question, index, questionDiv, resultElement) {
        const quizForm = document.getElementById('quiz-form');
        const userAnswer = quizForm.querySelector(`input[name="q${index}"]`).value.trim();
        
        if (!userAnswer) {
            resultElement.textContent = 'Please enter an answer.';
            resultElement.classList.add('wrong');
            return 'unanswered';
        }

        const correctAnswers = question.correctAnswers;
        const isCorrect = correctAnswers.some(answer => 
            this.normalizeText(answer) === this.normalizeText(userAnswer)
        );

        if (isCorrect) {
            resultElement.textContent = 'Correct! 🎉';
            resultElement.classList.add('correct');
            return 'correct';
        } else {
            resultElement.textContent = `Wrong! Possible answers: ${correctAnswers.join(', ')}`;
            resultElement.classList.add('wrong');
            return 'wrong';
        }
    }

    validateFillBlank(question, index, questionDiv, resultElement) {
        const blankInputs = questionDiv.querySelectorAll(`input[name^="q${index}_blank"]`);
        const userAnswers = Array.from(blankInputs).map(input => input.value.trim());
        
        if (userAnswers.some(answer => !answer)) {
            resultElement.textContent = 'Please fill in all blanks.';
            resultElement.classList.add('wrong');
            return 'unanswered';
        }

        const correctAnswers = question.blanks;
        let correctCount = 0;
        
        userAnswers.forEach((answer, i) => {
            if (i < correctAnswers.length && 
                this.normalizeText(answer) === this.normalizeText(correctAnswers[i])) {
                correctCount++;
                blankInputs[i].style.backgroundColor = '#e6ffe6';
                blankInputs[i].style.border = '2px solid #27ae60';
            } else {
                blankInputs[i].style.backgroundColor = '#ffe6e6';
                blankInputs[i].style.border = '2px solid #e74c3c';
            }
        });

        if (correctCount === correctAnswers.length && correctCount === userAnswers.length) {
            resultElement.textContent = 'Correct! 🎉';
            resultElement.classList.add('correct');
            return 'correct';
        } else if (correctCount > 0) {
            resultElement.textContent = `Partial Credit! ${correctCount}/${correctAnswers.length} correct.`;
            resultElement.classList.add('partial');
            return 'partial';
        } else {
            resultElement.textContent = `Wrong! Correct answers: ${correctAnswers.join(', ')}`;
            resultElement.classList.add('wrong');
            return 'wrong';
        }
    }

    validateMatching(question, index, questionDiv, resultElement) {
        const dropZones = questionDiv.querySelectorAll('.drop-zone');
        const userMatches = {};
        let answeredCount = 0;

        dropZones.forEach(zone => {
            const draggedItem = zone.querySelector('.draggable-item');
            if (draggedItem) {
                const target = zone.dataset.target;
                const item = draggedItem.dataset.item;
                userMatches[item] = target;
                answeredCount++;
            }
        });

        if (answeredCount === 0) {
            resultElement.textContent = 'Please drag items to match them.';
            resultElement.classList.add('wrong');
            return 'unanswered';
        }

        const correctMatches = question.correctMatches;
        let correctCount = 0;
        const totalMatches = Object.keys(correctMatches).length;

        // Validate each match
        Object.keys(userMatches).forEach(item => {
            const dropZone = questionDiv.querySelector(`[data-target="${userMatches[item]}"]`);
            if (correctMatches[item] === userMatches[item]) {
                correctCount++;
                dropZone.style.backgroundColor = '#e6ffe6';
                dropZone.style.border = '2px solid #27ae60';
            } else {
                dropZone.style.backgroundColor = '#ffe6e6';
                dropZone.style.border = '2px solid #e74c3c';
            }
        });

        // Show correct matches for unmatched items
        Object.keys(correctMatches).forEach(item => {
            if (!userMatches[item]) {
                const correctTarget = correctMatches[item];
                const dropZone = questionDiv.querySelector(`[data-target="${correctTarget}"]`);
                if (dropZone && !dropZone.querySelector('.draggable-item')) {
                    dropZone.style.backgroundColor = '#d4edda';
                    dropZone.style.border = '2px dashed #27ae60';
                    dropZone.querySelector('.placeholder').textContent += ` (should be: ${item})`;
                }
            }
        });

        if (correctCount === totalMatches && answeredCount === totalMatches) {
            resultElement.textContent = 'Correct! 🎉';
            resultElement.classList.add('correct');
            return 'correct';
        } else if (correctCount > 0) {
            resultElement.textContent = `Partial Credit! ${correctCount}/${totalMatches} correct matches.`;
            resultElement.classList.add('partial');
            return 'partial';
        } else {
            resultElement.textContent = 'Wrong! Check the correct matches above.';
            resultElement.classList.add('wrong');
            return 'wrong';
        }
    }

    highlightOptions(questionDiv, answers, type) {
        const colorMap = {
            'correct': { bg: '#e6ffe6', border: '#27ae60' },
            'wrong': { bg: '#ffe6e6', border: '#e74c3c' },
            'partial': { bg: '#fef9e7', border: '#f39c12' }
        };
        
        const colors = colorMap[type];
        
        answers.forEach(answer => {
            const input = questionDiv.querySelector(`input[value="${answer}"]`);
            if (input && input.parentElement) {
                input.parentElement.style.backgroundColor = colors.bg;
                input.parentElement.style.border = `1px solid ${colors.border}`;
            }
        });
    }

    showCorrectAnswers(questionDiv, correctAnswers, selectedAnswers) {
        correctAnswers.forEach(answer => {
            const input = questionDiv.querySelector(`input[value="${answer}"]`);
            if (input && input.parentElement && !selectedAnswers.includes(answer)) {
                input.parentElement.style.backgroundColor = '#d4edda';
                input.parentElement.style.border = '1px solid #27ae60';
                input.parentElement.style.opacity = '0.7';
            }
        });
    }

    normalizeText(text) {
        return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
    }
}