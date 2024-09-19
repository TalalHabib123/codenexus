export async function detectCodeSmells(asts: { ast: any, filePath: string, fileContent: string }[]) {
    const declaredVars: string[] = [];
    const usedVars: string[] = [];
    const functionBodies: Map<string, string> = new Map(); // For duplicated code detection
    const magicNumbers: number[] = [];  // Global tracking for magic numbers across all ASTs
    const snakeCaseNames: string[] = []; // Track snake_case names
    const camelCaseNames: string[] = []; // Track camelCase names
    const otherCaseNames: string[] = []; // Track other naming styles

    // Regular expressions for naming conventions
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const camelCasePattern = /^[a-z]+([A-Z][a-z]*)*$/;

    const traverseAST = (node: any, declaredVars: string[], usedVars: string[], context: any = { depth: 0 }) => {
        if (!node || typeof node !== "object") { return; };

        // Detect variable declarations (e.g., "x = 5")
        if (node._type === "Assign" && node.targets && node.targets.length > 0) {
            if (node.targets[0]._type === "Name") {
                const varName = node.targets[0].id;
                declaredVars.push(varName);

                // Detect naming convention for variables
                if (snakeCasePattern.test(varName)) {
                    snakeCaseNames.push(varName);
                } else if (camelCasePattern.test(varName)) {
                    camelCaseNames.push(varName);
                } else {
                    otherCaseNames.push(varName);
                }
            }
        }
        // Detect variable usage (e.g., using "x")
        else if (node._type === "Name" && node.ctx && node.ctx._type === "Load") {
            usedVars.push(node.id);
        }

        // Detect magic numbers
        if (node._type === "Constant" && typeof node.value === 'number' && node.value !== 0 && node.value !== 1) {
            magicNumbers.push(node.value);
        }

        // Detect duplicated code in function bodies
        if (node._type === "FunctionDef") {
            const functionName = node.name;

            // Detect naming convention for functions
            if (snakeCasePattern.test(functionName)) {
                snakeCaseNames.push(functionName);
            } else if (camelCasePattern.test(functionName)) {
                camelCaseNames.push(functionName);
            } else {
                otherCaseNames.push(functionName);
            }

            // Check if function has more than 3 arguments
            if (node.args.args.length > 3) {
                console.log(`Function ${functionName} has more than 3 arguments`);
            }

            // Detect duplicated function bodies
            const bodyString = JSON.stringify(node.body); // Convert function body to string for comparison
            if (functionBodies.has(bodyString)) {
                console.log(`Duplicated code detected in function: ${functionName}`);
            } else {
                functionBodies.set(bodyString, functionName);
            }
        }

        // Recursively traverse child nodes
        for (const key in node) {
            if (Array.isArray(node[key])) {
                for (const child of node[key]) {
                    traverseAST(child, declaredVars, usedVars, { ...context, depth: context.depth + 1 });
                }
            } else if (typeof node[key] === "object") {
                traverseAST(node[key], declaredVars, usedVars, { ...context, depth: context.depth + 1 });
            }
        }
    };

    // Loop through the list of ASTs and process each one
    for (const { ast, filePath, fileContent } of asts) {
        console.log(`Starting AST traversal for file: ${filePath}`);

        // Reset declared and used variables and functionBodies for each AST, but keep magicNumbers as global across ASTs
        const declaredVars: string[] = [];
        const usedVars: string[] = [];
        const functionBodies: Map<string, string> = new Map(); // For tracking function bodies

        // Traverse the AST and collect data
        traverseAST(ast, declaredVars, usedVars);

        // Find and log unused variables
        const unusedVars = declaredVars.filter(x => !usedVars.includes(x));
        if (unusedVars.length > 0) {
            console.log(`Unused variables in file ${filePath}:`, unusedVars);
        }
    }

    // Log detected magic numbers after all ASTs have been processed
    if (magicNumbers.length > 0) {
        console.log("Magic numbers detected across all ASTs:", magicNumbers);
    }

    // Log naming convention results
    if (snakeCaseNames.length > 0) {
        console.log("Snake_case names detected:", snakeCaseNames);
    }
    if (camelCaseNames.length > 0) {
        console.log("CamelCase names detected:", camelCaseNames);
    }
    if (otherCaseNames.length > 0) {
        console.log("Other naming conventions detected:", otherCaseNames);
    }
}
