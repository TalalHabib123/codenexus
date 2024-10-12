// Used to find function declaration 
function findFunctionLineNumber(pythonCode: string, functionName: string): number | null {
    const lines = pythonCode.split('\n');
    const functionPattern = new RegExp(`^\\s*def\\s+${functionName}\\s*\\(`);
    const classPattern = /^\s*class\s+\w+/;
    let currentIndentationLevel: number | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Detect class definitions to set the indentation level.
        if (classPattern.test(line)) {
            currentIndentationLevel = line.search(/\S/);
        }

        // If a function is found and we're not inside a class (or outside its indentation level).
        if (functionPattern.test(line)) {
            const functionIndentation = line.search(/\S/);

            // If currentIndentationLevel is null, or function is at a lower indentation level, it's a top-level function.
            if (currentIndentationLevel === null || functionIndentation <= currentIndentationLevel) {
                return i + 1; // Return 1-indexed line number.
            }
        }

        // Reset currentIndentationLevel when out of class scope.
        if (currentIndentationLevel !== null && trimmedLine === '') {
            currentIndentationLevel = null;
        }
    }

    return null; // If no function definition is found.
}

// Used to find class declaration 
function findClassLineNumber(pythonCode: string, className: string): number | null {
    const lines = pythonCode.split('\n');
    // The updated regex allows for an optional opening parenthesis and handles whitespace better.
    const classPattern = new RegExp(`^\\s*class\\s+${className}\\s*(\\(|:|\\s)*`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for class definition using the pattern.
        if (classPattern.test(line)) {
            return i + 1; // Return the 1-indexed line number.
        }
    }

    return null; // If no class definition is found.
}

// Used to find class variable declaration
function findClassVariableLineNumber(pythonCode: string, className: string, variableName: string): number | null {
    const lines = pythonCode.split('\n');
    const classPattern = new RegExp(`^\\s*class\\s+${className}\\s*(:|\\(|\\s)*`);
    const variablePattern = new RegExp(`\\b${variableName}\\b`);
    let insideClass = false;
    let classIndentation: number | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if we're entering the specified class.
        if (classPattern.test(line)) {
            insideClass = true;
            classIndentation = line.search(/\S/);
            continue;
        }

        // If we're inside the class, look for the variable.
        if (insideClass) {
            // Determine the indentation of the current line.
            const currentIndentation = line.search(/\S/);

            // If the current line is not indented more than the class, we're outside the class.
            if (classIndentation !== null && currentIndentation <= classIndentation) {
                insideClass = false;
                classIndentation = null;
            } else if (variablePattern.test(line)) {
                // Return the line number when we find the variable.
                return i + 1; // Adjust to 1-indexed.
            }
        }
    }

    return null; // If no variable instance is found.
}

// Used to find class function declaration
function findClassFunctionLineNumber(pythonCode: string, className: string, functionName: string): number | null {
    const lines = pythonCode.split('\n');
    const classPattern = new RegExp(`^\\s*class\\s+${className}\\b`);
    const functionPattern = new RegExp(`^\\s*def\\s+${functionName}\\s*\\(`);
    let insideClass = false;
    let classIndentation: number | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const currentIndentation = line.search(/\S|$/);

        // Step 1: Identify when we enter the class.
        if (classPattern.test(line) && !insideClass) {
            insideClass = true;
            classIndentation = currentIndentation;
            continue;
        }

        // Step 2: If we're inside the class, look for the function definition.
        if (insideClass && classIndentation !== null) {
            // If the current line is less indented than the class, we've exited the class scope.
            if (currentIndentation <= classIndentation && line.trim() !== '') {
                insideClass = false;
                classIndentation = null;
                continue;
            }

            // Step 3: Check for the function definition with more indentation than the class.
            if (functionPattern.test(line) && currentIndentation > classIndentation) {
                return i + 1; // Return 1-indexed line number.
            }
        }
    }

    return null; // If no function definition is found.
}


// Used to find global variable declaration
function findGlobalVariableLineNumber(pythonCode: string, variableName: string): number | null {
    const lines = pythonCode.split('\n');
    const variablePattern = new RegExp(`^\\s*${variableName}\\s*=`);
    let insideBlock = false;
    let blockIndentation: number | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const currentIndentation = line.search(/\S|$/);

        // Check if the line starts a block (class or function).
        if (/^\s*(class|def)\s+\w+/.test(line) && !insideBlock) {
            insideBlock = true;
            blockIndentation = currentIndentation;
            continue;
        }

        // If we're inside a block, check for exiting it.
        if (insideBlock && blockIndentation !== null) {
            if (currentIndentation <= blockIndentation && line.trim() !== '') {
                insideBlock = false;
                blockIndentation = null;
            }
        }

        // Check if this line declares the variable and we're not inside a block.
        if (!insideBlock && variablePattern.test(line)) {
            return i + 1; // Return the 1-indexed line number.
        }
    }

    return null; // If no global variable declaration is found.
}


// Used to find package import declaration
function findPackageImportLineNumber(pythonCode: string, packageName: string): number | null {
    const lines = pythonCode.split('\n');
    // Regex to match both `import package_name` and `from package_name import ...`
    const importPattern = new RegExp(`^\\s*(import\\s+${packageName}\\b|from\\s+${packageName}\\b)`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if the line matches the import pattern.
        if (importPattern.test(line)) {
            return i + 1; // Return the 1-indexed line number.
        }
    }

    return null; // If the package is not imported.
}


// For unreachable code
function extractLineNumber(message: string): number | null {
    const match = message.match(/(\d+)\s*$/);
    return match ? parseInt(match[1], 10) : null;
    // Unreachable 'else' block at line 23"
}

// For Temporary Variable
export function extractUsedAtLines(message: string): number[] | null {
    const match = message.match(/used at \[(.*?)\]/);
    if (match && match[1]) {
        // Split the matched numbers by commas and convert them to integers.
        return match[1].split(',').map(num => parseInt(num.trim(), 10));
    }
    return null; // Return null if no match is found.
   
}