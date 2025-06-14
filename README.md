# Enhanced Exam Preparation Quiz

A sophisticated web-based quiz application that supports multiple question types, Firebase integration for user progress tracking, and adaptive learning features.

## 🚀 Features

### Question Types Supported
- **Multiple Choice (Single Answer)** - Traditional A, B, C, D format
- **Multiple Choice (Multiple Answers)** - Select multiple correct options
- **True/False Questions** - Simple binary choice questions
- **Text Input Questions** - Free-form text answers with multiple accepted variations
- **Fill in the Blanks** - Complete sentences with missing words
- **Drag & Drop Matching** - Match items between two lists

### Smart Learning Features
- **Adaptive Retesting** - Focus on previously incorrect or unanswered questions
- **Progress Tracking** - Firebase-powered user progress persistence
- **Timer Support** - Configurable time limits for exam simulation
- **Partial Credit** - Intelligent scoring for multi-part questions
- **Answer History** - Track your improvement over time

### User Experience
- **Anonymous Authentication** - No signup required, automatic user ID generation
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Real-time Feedback** - Immediate explanations after each answer
- **Session Management** - Clear progress data or wrong answers as needed

## 🛠️ Setup & Installation

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/chandransandeep/SSA23.git
   cd SSA23
   ```

2. Create your questions file (`questions.csv`) in the root directory

3. Open `index.html` in a web browser or serve via a local web server

### Firebase Configuration
The app comes pre-configured with Firebase for user progress tracking. No additional setup required for basic usage.

## 📝 Creating Quiz Content

### CSV File Structure
Create a `questions.csv` file with the following structure:

#### Required Columns
- `QuestionNumber` - Sequential number (1, 2, 3...)
- `QuestionType` - Specify the question type explicitly
- `QuestionText` - The actual question

#### Optional Columns (Based on Question Type)
- `OptionA`, `OptionB`, `OptionC`, `OptionD` - Multiple choice options
- `Answer 1`, `Answer 2`, `Answer 3`, etc. - Correct answers
- `LeftItems`, `RightItems` - For matching questions (comma-separated)
- `CorrectMatches` - Correct pairs for matching (format: "Item1-Match1,Item2-Match2")
- `BlankAnswers` - For fill-in-blank questions (comma-separated)
- `Explanation` - Shown after answering

### Complete CSV Header
```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
```

### Question Type Examples

#### Multiple Choice (Single Answer)
```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
1,multiple-choice,What is the capital of France?,London,Berlin,Paris,Rome,,,,C,,,,,,"Paris is the capital city of France"
```

#### Multiple Choice (Multiple Answers)
```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
2,multiple-choice,Which are programming languages?,Java,HTML,Python,CSS,,,,A,C,,,,,"Java and Python are programming languages while HTML and CSS are markup/styling languages"
```

#### True/False
```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
3,true-false,The Earth is flat,True,False,,,,,B,,,,,,"The Earth is spherical in shape, not flat"
```

#### Text Input
```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
4,text-input,What is the largest planet in our solar system?,,,,,,,Jupiter,jupiter,JUPITER,,,,"Jupiter is the largest planet by both mass and volume"
```

#### Fill in the Blanks
```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
5,fill-blank,The ___ is the powerhouse of the ___,,,,,,,,,,,,"mitochondria,cell","Mitochondria generate ATP energy for cellular processes"
```

#### Drag & Drop Matching
```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
6,matching,Match programming languages with their creators,,,,,"Python,Java,JavaScript","Guido van Rossum,James Gosling,Brendan Eich","Python-Guido van Rossum,Java-James Gosling,JavaScript-Brendan Eich",,,,,,,"These are the original creators of these popular programming languages"
```

## 📋 Complete Example CSV File

Here's a complete example with all question types:

```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,Answer 4,Answer 5,BlankAnswers,Explanation
1,multiple-choice,What is 2+2?,3,4,5,6,,,,B,,,,,,"Basic arithmetic: 2+2=4"
2,multiple-choice,Which are prime numbers?,2,4,3,6,,,,A,C,,,,,"Prime numbers are only divisible by 1 and themselves"
3,true-false,The sun is a star,True,False,,,,,B,,,,,,"The sun is indeed a star, specifically a G-type main-sequence star"
4,text-input,What is the largest ocean?,,,,,,,Pacific,pacific,PACIFIC,,,,"The Pacific Ocean covers about 46% of Earth's water surface"
5,fill-blank,The ___ revolves around the ___,,,,,,,,,,,,"Earth,Sun","Earth orbits the Sun due to gravitational force"
6,matching,Match countries with capitals,,,,,"France,Germany,Italy","Paris,Berlin,Rome","France-Paris,Germany-Berlin,Italy-Rome",,,,,,,"Basic geography knowledge about European capitals"
```

## 🎯 Usage

### Basic Quiz Taking
1. Open the application in your browser
2. Configure your preferences:
   - Set quiz title
   - Choose number of questions (or leave blank for all)
   - Enable/disable timer
3. Answer questions using the appropriate interface for each type
4. Submit to see your results and explanations

### Adaptive Learning Mode
- **"Retake Only Wrong/Unanswered"** mode focuses on questions you haven't mastered
- Track your progress with the stats display (Wrong/Unanswered/Correct counts)
- Clear your history to start fresh when needed

### Timer Mode
- Enable timer for exam simulation
- Configure time limit in minutes
- Timer automatically submits when time expires

## 🔧 Technical Details

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6 modules)
- **Backend**: Firebase (Authentication, Firestore)
- **Styling**: Custom CSS with responsive design
- **Data Format**: CSV with auto-detection

### File Structure
```
SSA23/
├── index.html              # Main application file
├── questions.csv           # Your quiz questions (create this)
├── scripts/
│   ├── firebase-config.js  # Firebase setup and authentication
│   └── quiz-core.js       # Core quiz logic and UI
└── styles/
    ├── main.css           # Main application styles
    └── question-types.css # Question-specific styling
```

### Supported Question Types
| Type | QuestionType Value | Description |
|------|-------------------|-------------|
| Multiple Choice (Single) | `multiple-choice` | One correct answer from 4 options |
| Multiple Choice (Multi) | `multiple-choice` | Multiple correct answers from 4 options |
| True/False | `true-false` | Binary choice questions |
| Text Input | `text-input` | Free-form text answers |
| Fill in Blanks | `fill-blank` | Complete sentences with `___` placeholders |
| Matching | `matching` | Drag and drop matching between two lists |

### Auto-Detection Rules
If `QuestionType` is not specified, the application automatically detects based on:
1. **Matching**: Presence of `LeftItems` and `RightItems`
2. **Fill-in-blank**: `___` in `QuestionText`
3. **True/False**: Only `OptionA` and `OptionB` with true/false values
4. **Text Input**: `Answer 1` present but no `OptionA`
5. **Multiple Choice**: `OptionA` and `OptionB` present

## 📊 Advanced Features

### Progress Tracking
- User progress is automatically saved to Firebase
- Anonymous authentication provides persistent user IDs
- Track which questions you've answered correctly over time

### Partial Credit System
- Multiple choice questions with multiple correct answers award partial points
- Fill-in-blank questions score based on correctly filled blanks
- Matching questions award points for each correct pair

### Performance Optimizations
- Efficient CSV parsing for large question sets
- Mobile-optimized touch interactions
- Lazy loading for better performance with large datasets

## 🚨 Troubleshooting

### Common Issues
1. **Questions not loading**: Ensure `questions.csv` is in the root directory
2. **Authentication errors**: Check browser console for Firebase connection issues
3. **Malformed CSV**: Validate your CSV format and encoding (UTF-8 recommended)
4. **Mobile display issues**: Ensure viewport meta tag is present

### CSV Formatting Tips
- **Commas in text**: Wrap in double quotes: `"Hello, world"`
- **Quotes in text**: Use single quotes inside or escape: `"He said 'hello'"`
- **Line breaks**: Use `\n` for line breaks within text
- **Empty columns**: Leave blank but include commas as placeholders
- **Encoding**: Save as UTF-8 to support special characters

### Best Practices
- Always include the `QuestionType` column for clarity
- Test your CSV file with a small subset first
- Use consistent formatting for all questions
- Provide clear, helpful explanations
- Keep question text concise but unambiguous

## 📈 Future Enhancements

### Planned Features
- Rich media support (images, audio, video)
- Question weighting system
- Detailed analytics dashboard
- Export/import of user progress
- Custom themes and branding

### Contributing
This project is actively developed for educational purposes. Feel free to suggest improvements or report issues.

## 📄 License

This project is open source and available under the MIT License.

## 📞 Support

For questions, issues, or contributions, please use the GitHub issue tracker or contact the repository owner.

---

**Repository**: [chandransandeep/SSA23](https://github.com/chandransandeep/SSA23)  
**Last Updated**: December 2024  
**Version**: 2.0 (Enhanced with Firebase Integration)
