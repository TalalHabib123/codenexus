import * as vscode from 'vscode';

export function registerCodeActionProvider(context: vscode.ExtensionContext) {
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    { scheme: 'file', language: 'python' },
    new LearnMoreCodeActionProvider(),
    { providedCodeActionKinds: LearnMoreCodeActionProvider.providedCodeActionKinds }
  );

  context.subscriptions.push(codeActionProvider);
}

class LearnMoreCodeActionProvider implements vscode.CodeActionProvider {
    static providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
  
    provideCodeActions(
      document: vscode.TextDocument,
      range: vscode.Range,
      context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
      const actions: vscode.CodeAction[] = [];
  
      for (const diagnostic of context.diagnostics) {
      
        if (diagnostic.range.contains(range)) {
          const action = new vscode.CodeAction(
            `Learn More: ${diagnostic.message}`,
            vscode.CodeActionKind.QuickFix
          );
  
          // Attach a command to the action
          action.command = {
            command: 'extension.learnMore',
            title: 'Learn More',
            arguments: [diagnostic] // Pass the specific diagnostic
          };
  
          action.diagnostics = [diagnostic]; // Associate the action with the diagnostic
          actions.push(action);
        }
      }
  
      return actions;
    }
  }
  
vscode.commands.registerCommand('extension.learnMore', async (diagnostic: vscode.Diagnostic) => {
    const panel = vscode.window.createWebviewPanel(
      'problemDetails',
      'Problem Details',
      vscode.ViewColumn.One,
      {}
    );
  
    panel.webview.html = getWebviewContent(diagnostic);
  });
  
  function getWebviewContent(diagnostic: vscode.Diagnostic) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Problem Details</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; }
          h2 { color: #007ACC; }
          .severity { font-weight: bold; color: red; }
        </style>
      </head>
      <body>
        <h2>Problem Details</h2>
        <p><strong>Message:</strong> ${diagnostic.message}</p>
        <p><strong>Severity:</strong> ${vscode.DiagnosticSeverity[diagnostic.severity]}</p>
        <p><strong>Range:</strong> ${JSON.stringify(diagnostic.range)}</p>
      </body>
      </html>
    `;
  }
  