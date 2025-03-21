import * as vscode from "vscode";



export class DiagnosticRefactorProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        // Filter diagnostics that match the selected range
        const matchingDiagnostics = context.diagnostics.filter(
            (diagnostic) => diagnostic.range.intersection(range) !== undefined
        );

        if (matchingDiagnostics.length === 0) {
            return undefined; // No relevant diagnostics found
        }

        // Map filtered diagnostics to specific code actions
        return matchingDiagnostics.map((diagnostic) => {


            // Create a descriptive title for the Code Action using template literals
            const actionTitle = `Fix "${diagnostic.message}" using codeNexus`;

            // Initialize the Code Action with the dynamic title
            const action = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);

            // Assign the command to be execruted when the Code Action is selected
            action.command = {
                command: "extension.refactorProblem",
                title: "Fix this using codeNexus", // This title won't appear in the Quick Fix menu
                arguments: [diagnostic], // Pass the specific diagnostic to the command
            };

            // Associate the diagnostic with this Code Action
            action.diagnostics = [diagnostic];

            // Optionally mark this as the preferred fix (if applicable)
            action.isPreferred = true;

            return action;
        });
    }
}