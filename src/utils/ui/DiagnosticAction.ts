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
    /* General styles */
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      margin: 0;
      background-color: #1e1e1e;
      color: #d4d4d4;
    }

    /* Title styles */
    h2 {
      color: #569cd6;
      font-size: 1.8rem;
      margin-bottom: 20px;
      border-bottom: 2px solid #569cd6;
      padding-bottom: 5px;
    }

    /* Container for each detail */
    .detail {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
    }

    /* Bold label for details */
    .detail strong {
      display: block;
      font-size: 1rem;
      color: #c586c0;
      margin-bottom: 8px;
    }

    /* Styles for severity */
    .severity {
      font-weight: bold;
      font-size: 1rem;
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
    }

    .severity-error { background-color: #ff5555; color: white; }
    .severity-warning { background-color: #ffcc00; color: black; }
    .severity-info { background-color: #1e90ff; color: white; }
    .severity-hint { background-color: #56d364; color: white; }

    /* Styles for range */
    .range {
      font-family: monospace;
      background-color: #333;
      color: #d4d4d4;
      padding: 5px 10px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h2>Problem Details</h2>

  <!-- Diagnostic Message -->
  <div class="detail">
    <strong>Message:</strong>
    <p>${diagnostic.message}</p>
  </div>

  <!-- Diagnostic Severity -->
  <div class="detail">
    <strong>Severity:</strong>
    <span class="severity-${vscode.DiagnosticSeverity[diagnostic.severity]}">${vscode.DiagnosticSeverity[diagnostic.severity]}</span>
  </div>

  <!-- Diagnostic Range -->
  <div class="detail">
    <strong>Range:</strong>
    <p class="range">${JSON.stringify(diagnostic.range)}</p>
  </div>
</body>
</html>

    `;
  }
  