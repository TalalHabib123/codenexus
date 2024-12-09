import * as vscode from 'vscode';

/**
 * Function to register diagnostic-related commands.
 */
export function registerDiagnosticCommands(context: vscode.ExtensionContext): void {
    // Command for 'Learn More' on a diagnostic
    context.subscriptions.push(
        vscode.commands.registerCommand('codenexus.learnMore', (diagnostic: vscode.Diagnostic) => {
            if (diagnostic) {
                showDiagnosticDetails(diagnostic);
            } else {
                vscode.window.showErrorMessage("No diagnostic selected.");
            }
        })
    );

   
}

/**
 * Function to show a detailed view of a diagnostic in a new tab.
 */
function showDiagnosticDetails(diagnostic: vscode.Diagnostic): void {
    const panel = vscode.window.createWebviewPanel(
        'diagnosticDetails',
        'Diagnostic Details',
        vscode.ViewColumn.One,
        {}
    );

    // HTML content for the diagnostic details tab
    panel.webview.html = getDiagnosticDetailsHtml(diagnostic);
}

/**
 * Generate the HTML content for the diagnostic details view.
 */
function getDiagnosticDetailsHtml(diagnostic: vscode.Diagnostic): string {
    const severity = vscode.DiagnosticSeverity[diagnostic.severity];
    const message = diagnostic.message;
    const range = `Line ${diagnostic.range.start.line + 1}, Column ${diagnostic.range.start.character + 1}`;

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Diagnostic Details</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #007acc; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
            </style>
        </head>
        <body>
            <h1>Diagnostic Details</h1>
            <table>
                <tr>
                    <th>Severity</th>
                    <td>${severity}</td>
                </tr>
                <tr>
                    <th>Message</th>
                    <td>${message}</td>
                </tr>
                <tr>
                    <th>Range</th>
                    <td>${range}</td>
                </tr>
            </table>
        </body>
        </html>
    `;
}
