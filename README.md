# Enhanced Quiz Application - CSV Format Guide

## Overview
This enhanced quiz application supports multiple question types through a flexible CSV format. The application automatically detects question types and renders appropriate interfaces.

## Supported Question Types

### 1. Multiple Choice (Single Answer)
**Format:** Standard A, B, C, D options with one correct answer

```csv
QuestionNumber,QuestionText,OptionA,OptionB,OptionC,OptionD,Answer 1,Explanation
1,What is the capital of France?,London,Berlin,Paris,Rome,C,Paris is the capital city of France
```

### 2. Multiple Choice (Multiple Answers)
**Format:** Standard options with multiple correct answers

```csv
QuestionNumber,QuestionText,OptionA,OptionB,OptionC,OptionD,Answer 1,Answer 2,Explanation
2,Which are programming languages?,Java,HTML,Python,CSS,A,C,Java and Python are programming languages
```

### 3. True/False Questions
**Format:** Only OptionA and OptionB with True/False values

```csv
QuestionNumber,QuestionText,OptionA,OptionB,Answer 1,Explanation
3,The Earth is flat,True,False,B,The Earth is spherical in shape
```

### 4. Text Input Questions
**Format:** No options provided, direct text answers

```csv
QuestionNumber,QuestionText,Answer 1,Answer 2,Answer 3,Explanation
4,What is the largest planet in our solar system?,Jupiter,jupiter,JUPITER,Jupiter is the largest planet by mass and volume
```

### 5. Fill in the Blanks
**Format:** Use `___` in question text for blanks

```csv
QuestionNumber,QuestionText,Answer 1,Answer 2,Explanation
5,The ___ is the powerhouse of the ___,mitochondria,cell,Mitochondria generate energy for cellular processes
```

### 6. Drag & Drop Matching
**Format:** Separate left and right items with correct matches

```csv
QuestionNumber,QuestionText,LeftItems,RightItems,CorrectMatches,Explanation
6,Match programming languages with their creators,Python,Java,JavaScript,"Guido van Rossum,James Gosling,Brendan Eich","Python-Guido van Rossum,Java-James Gosling,JavaScript-Brendan Eich",These are the original creators of these languages
```

## CSV Structure Requirements

### Required Columns (Always Include)
- `QuestionNumber` - Sequential number (1, 2, 3...)
- `QuestionText` - The actual question

### Optional Columns (Based on Question Type)
- `QuestionType` - Explicit type: "multiple-choice", "true-false", "text-input", "fill-blank", "matching"
- `OptionA`, `OptionB`, `OptionC`, `OptionD` - Multiple choice options
- `Answer 1`, `Answer 2`, `Answer 3`, `Answer 4`, `Answer 5` - Correct answers
- `LeftItems` - Items to match (comma-separated)
- `RightItems` - Target items (comma-separated)
- `CorrectMatches` - Correct pairs in format "Left1-Right1,Left2-Right2"
- `BlankAnswers` - Answers for fill-in-the-blank (comma-separated)
- `Explanation` - Explanation shown after answering

## Auto-Detection Rules

The application automatically detects question types based on:

1. **Matching:** Presence of `LeftItems` and `RightItems`
2. **Fill-in-blank:** `___` in `QuestionText`
3. **True/False:** Only `OptionA` and `OptionB` with true/false values
4. **Text Input:** `Answer 1` present but no `OptionA`
5. **Multiple Choice:** `OptionA` and `OptionB` present

## Example Complete CSV File

```csv
QuestionNumber,QuestionType,QuestionText,OptionA,OptionB,OptionC,OptionD,LeftItems,RightItems,CorrectMatches,Answer 1,Answer 2,Answer 3,BlankAnswers,Explanation
1,multiple-choice,What is 2+2?,3,4,5,6,,,,B,,,,"Basic arithmetic: 2+2=4"
2,multiple-choice,Which are prime numbers?,2,4,3,6,,,,A,C,,,Prime numbers are only divisible by 1 and themselves
3,true-false,The sun is a star,True,False,,,,,B,,,,"The sun is indeed a star, specifically a G-type main-sequence star"
4,text-input,What is the largest ocean?,,,,,,,,,Pacific,pacific,PACIFIC,,The Pacific Ocean covers about 46% of Earth's water surface
5,fill-blank,The ___ revolves around the ___,,,,,,,,,,,,"Earth,Sun",Earth orbits the Sun due to gravitational force
6,matching,Match countries with capitals,,,,"France,Germany,Italy","Paris,Berlin,Rome","France-Paris,Germany-Berlin,Italy-Rome",,,,,"Basic geography knowledge about European capitals"
```

## Formatting Guidelines

### Text Formatting
- **Commas in text:** Wrap in double quotes: `"Hello, world"`
- **Quotes in text:** Use single quotes inside or escape: `"He said 'hello'"`
- **Line breaks:** Use `\n` for line breaks within text
- **Special characters:** Generally supported, test if issues arise

### Answer Formatting
- **Case sensitivity:** Text answers are case-insensitive
- **Multiple answers:** Use Answer 1, Answer 2, etc. for alternatives
- **Matching format:** Use "Left-Right,Left2-Right2" format
- **Blank answers:** Comma-separated list or use Answer 1, Answer 2, etc.

### File Requirements
- **Encoding:** UTF-8 recommended
- **File name:** Must be `questions.csv`
- **Location:** Same directory as `index.html`
- **Headers:** First row must contain column headers
- **No empty rows:** Between questions

## Advanced Features

### Partial Credit
- **Multiple choice:** Partial points for some correct answers
- **Fill-in-blank:** Partial points for some correct blanks
- **Matching:** Partial points for some correct matches

### Question Weighting
Currently all questions have equal weight. Future versions may support:
```csv
QuestionNumber,QuestionText,Weight,Answer 1,Explanation
1,Easy question,1,A,Worth 1 point
2,Hard question,3,B,Worth 3 points
```

### Rich Content Support
Future versions may support:
- **Images:** `ImageURL` column for question images
- **Audio:** `AudioURL` column for audio questions
- **Video:** `VideoURL` column for video content

## Error Handling

### Common Issues
1. **Missing headers:** Ensure QuestionNumber and QuestionText are present
2. **Malformed rows:** Check comma count matches header count
3. **File not found:** Ensure questions.csv is in correct location
4. **Encoding issues:** Save as UTF-8

### Debugging Tips
1. **Check browser console:** Look for parsing errors
2. **Validate CSV:** Use online CSV validators
3. **Test incrementally:** Start with simple questions, add complexity
4. **Check quotes:** Ensure proper quoting of text with commas

## Performance Considerations
- **File size:** Large CSV files (>1MB) may load slowly
- **Question count:** 500+ questions may impact performance
- **Images:** External images may slow loading
- **Mobile:** Touch interactions optimized for mobile devices

## Best Practices

### Question Design
1. **Clear wording:** Avoid ambiguous questions
2. **Appropriate difficulty:** Match your audience level
3. **Good distractors:** Make wrong answers plausible
4. **Helpful explanations:** Provide learning value

### File Organization
1. **Consistent naming:** Use clear, consistent question numbering
2. **Logical grouping:** Group related questions together
3. **Version control:** Keep backups of your CSV files
4. **Testing:** Test all question types before deployment

## Migration from Basic Format
If you have existing CSV files in the basic format:
1. Keep existing columns - they're fully supported
2. Add new question types gradually
3. Test thoroughly after changes
4. The app maintains backward compatibility

## Support and Troubleshooting
- Check the browser console for detailed error messages
- Validate your CSV format using online tools
- Start with simple examples and build complexity gradually
- Ensure proper encoding (UTF-8) for special characters
