import * as vscode from 'vscode';

export function showProblemsTab() {
    vscode.commands.executeCommand('workbench.action.problems.focus');
}

// Create a diagnostic collection
const diagnosticCollection = vscode.languages.createDiagnosticCollection('codeSmells');

// Function to add a diagnostic entry
export function addDiagnostic(problem: string, filePath: string) {
    vscode.workspace.openTextDocument(filePath).then(document => {
        const diagnostics: vscode.Diagnostic[] = [];
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)); // Empty range

        const diagnostic = new vscode.Diagnostic(range, problem, vscode.DiagnosticSeverity.Warning);
        
        // Use a tag to mark it as unnecessary, fading it out in the editor (optional)
        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];

        // Add the diagnostic entry to the collection
        diagnostics.push(diagnostic);
        diagnosticCollection.set(document.uri, diagnostics);
    });
}
