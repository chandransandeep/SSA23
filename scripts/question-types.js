// Question Types Handler
export class QuestionTypes {
    constructor() {
        this.typeDetectors = {
            'matching': this.isMatchingQuestion,
            'fill-blank': this.isFillBlankQuestion,
            'true-false': this.isTrueFalseQuestion,
            'text-input': this.isTextInputQuestion,
            'multiple-choice': this.isMultipleChoiceQuestion
        };
    }

    processQuestion(questionObj) {
        // Detect question type
        questionObj.questionType = this.detectQuestionType(questionObj);
        
        // Process based on type
        this.processQuestionByType(questionObj);
        
        return questionObj;
    }

    detectQuestionType(questionObj) {
        // Check for explicit type first
        if (questionObj.QuestionType) {
            return questionObj.QuestionType.toLowerCase();
        }
        
        // Auto-detect based on content
        for (const [type, detector] of Object.entries(this.typeDetectors)) {
            if (detector(questionObj)) {
                return type;
            }
        }
        
        return 'multiple-choice'; // Default fallback
    }

    isMatchingQuestion(questionObj) {
        return !!(questionObj.LeftItems && questionObj.RightItems);
    }

    isFillBlankQuestion(questionObj) {
        return !!(questionObj.QuestionText && questionObj.QuestionText.includes('___'));
    }

    isTrueFalseQuestion(questionObj) {
        return !!(questionObj.OptionA && questionObj.OptionB && 
                 !questionObj.OptionC && !questionObj.OptionD &&
                 (questionObj.OptionA.toLowerCase().includes('true') || 
                  questionObj.OptionA.toLowerCase().includes('false') ||
                  questionObj.OptionB.toLowerCase().includes('true') || 
                  questionObj.OptionB.toLowerCase().includes('false')));
    }

    isTextInputQuestion(questionObj) {
        return !!(questionObj['Answer 1'] && !questionObj.OptionA && !questionObj.OptionB);
    }

    isMultipleChoiceQuestion(questionObj) {
        return !!(questionObj.OptionA && questionObj.OptionB);
    }

    processQuestionByType(questionObj) {
        switch (questionObj.questionType) {
            case 'matching':
                this.processMatchingQuestion(questionObj);
                break;
            case 'fill-blank':
                this.processFillBlankQuestion(questionObj);
                break;
            case 'true-false':
                this.processTrueFalseQuestion(questionObj);
                break;
            case 'text-input':
                this.processTextInputQuestion(questionObj);
                break;
            case 'multiple-choice':
            default:
                this.processMultipleChoiceQuestion(questionObj);
                break;
        }
    }

    processMatchingQuestion(questionObj) {
        questionObj.leftItems = questionObj.LeftItems ? 
            questionObj.LeftItems.split(',').map(s => s.trim()) : [];
        questionObj.rightItems = questionObj.RightItems ? 
            questionObj.RightItems.split(',').map(s => s.trim()) : [];
        questionObj.correctMatches = {};
        
        if (questionObj.CorrectMatches) {
            questionObj.CorrectMatches.split(',').forEach(match => {
                const [left, right] = match.split('-').map(s => s.trim());
                if (left && right) {
                    questionObj.correctMatches[left] = right;
                }
            });
        }
    }

    processFillBlankQuestion(questionObj) {
        questionObj.blanks = [];
        if (questionObj.BlankAnswers) {
            questionObj.blanks = questionObj.BlankAnswers.split(',').map(s => s.trim());
        } else {
            // Collect answers from Answer 1, Answer 2, etc.
            for (let i = 1; i <= 5; i++) {
                if (questionObj[`Answer ${i}`] && questionObj[`Answer ${i}`].trim()) {
                    questionObj.blanks.push(questionObj[`Answer ${i}`].trim());
                }
            }
        }
    }

    processTrueFalseQuestion(questionObj) {
        questionObj.correctAnswer = questionObj['Answer 1'] || 'True';
    }

    processTextInputQuestion(questionObj) {
        questionObj.correctAnswers = [];
        for (let i = 1; i <= 5; i++) {
            if (questionObj[`Answer ${i}`] && questionObj[`Answer ${i}`].trim()) {
                questionObj.correctAnswers.push(questionObj[`Answer ${i}`].trim());
            }
        }
    }

    processMultipleChoiceQuestion(questionObj) {
        questionObj.correctAnswers = [];
        for (let i = 1; i <= 5; i++) {
            if (questionObj[`Answer ${i}`] && questionObj[`Answer ${i}`].trim()) {
                questionObj.correctAnswers.push(questionObj[`Answer ${i}`].trim());
            }
        }
        questionObj.isMultipleChoice = questionObj.correctAnswers.length > 1;
    }

    createQuestionElement(question, index) {
        const questionTypeText = this.getQuestionTypeIndicator(question.questionType);
        
        let questionHTML = `
            <div class="question" data-question-index="${index}" data-question-type="${question.questionType}">
                <div class="question-title">${index + 1}. ${question.QuestionText || 'No Question Text'}</div>
                <div class="question-type-indicator">${questionTypeText}</div>
        `;

        switch (question.questionType) {
            case 'matching':
                questionHTML += this.createMatchingQuestion(question, index);
                break;
            case 'fill-blank':
                questionHTML += this.createFillBlankQuestion(question, index);
                break;
            case 'true-false':
                questionHTML += this.createTrueFalseQuestion(question, index);
                break;
            case 'text-input':
                questionHTML += this.createTextInputQuestion(question, index);
                break;
            case 'multiple-choice':
            default:
                questionHTML += this.createMultipleChoiceQuestion(question, index);
                break;
        }

        questionHTML += `
                <div class="result" id="result-q${index}"></div>
                <div class="explanation" id="explanation-q${index}"></div>
                <div class="question-actions">
                    <button type="button" class="validate-btn" data-question-index="${index}">Validate Answer</button>
                </div>
            </div>
        `;

        return questionHTML;
    }

    getQuestionTypeIndicator(type) {
        const indicators = {
            'multiple-choice': '(Multiple Choice)',
            'true-false': '(True/False)',
            'fill-blank': '(Fill in the Blanks)',
            'matching': '(Drag & Drop Matching)',
            'text-input': '(Text Input)'
        };
        return indicators[type] || '(Question)';
    }

    createMultipleChoiceQuestion(question, index) {
        const options = {
            A: question.OptionA || '',
            B: question.OptionB || '',
            C: question.OptionC || '',
            D: question.OptionD || ''
        };

        const inputType = question.isMultipleChoice ? 'checkbox' : 'radio';
        const inputName = question.isMultipleChoice ? `q${index}[]` : `q${index}`;

        return `
            <div class="options">
                ${Object.entries(options).filter(([key, value]) => value).map(([key, value]) => `
                    <label>
                        <input type="${inputType}" name="${inputName}" value="${key}" /> 
                        <span>${key}. ${value}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }

    createTrueFalseQuestion(question, index) {
        return `
            <div class="true-false-options">
                <div class="true-false-option" data-value="True" onclick="window.selectTrueFalse(${index}, 'True')">
                    <strong>True</strong>
                </div>
                <div class="true-false-option" data-value="False" onclick="window.selectTrueFalse(${index}, 'False')">
                    <strong>False</strong>
                </div>
            </div>
            <input type="hidden" name="q${index}" id="tf-${index}" />
        `;
    }

    createTextInputQuestion(question, index) {
        return `
            <div class="text-input-container">
                <input type="text" name="q${index}" class="text-input" placeholder="Enter your answer here..." />
            </div>
        `;
    }

    createFillBlankQuestion(question, index) {
        let questionText = question.QuestionText;
        let blankIndex = 0;
        
        // Replace ___ with input fields
        questionText = questionText.replace(/___/g, () => {
            return `<input type="text" name="q${index}_blank${blankIndex++}" class="blank-input" placeholder="?" />`;
        });

        return `
            <div class="fill-blank-container">
                <div class="question-with-blanks">${questionText}</div>
            </div>
        `;
    }

    createMatchingQuestion(question, index) {
        const leftItems = question.leftItems || [];
        const rightItems = question.rightItems || [];
        
        return `
            <div class="matching-container">
                <div class="matching-column">
                    <h4>Items to Match</h4>
                    <div class="draggable-items">
                        ${leftItems.map((item, i) => `
                            <div class="draggable-item" draggable="true" data-item="${item}" data-question="${index}">
                                ${item}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="matching-column">
                    <h4>Match With</h4>
                    <div class="drop-zones">
                        ${rightItems.map((item, i) => `
                            <div class="drop-zone" data-target="${item}" data-question="${index}">
                                <span class="placeholder">${item}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}

// Global function for True/False selection
window.selectTrueFalse = function(index, value) {
    const options = document.querySelectorAll(`[data-question-index="${index}"] .true-false-option`);
    options.forEach(option => option.classList.remove('selected'));
    
    const selected = document.querySelector(`[data-question-index="${index}"] .true-false-option[data-value="${value}"]`);
    if (selected) {
        selected.classList.add('selected');
    }
    
    const hiddenInput = document.getElementById(`tf-${index}`);
    if (hiddenInput) {
        hiddenInput.value = value;
    }
};