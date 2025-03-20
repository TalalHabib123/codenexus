// src/views/projectsViewProvider.ts
import * as vscode from 'vscode';
import { AuthService } from './authService';
import { HttpClient } from './httpClient';

export class ProjectsViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _authService: AuthService,
    private readonly _httpClient: HttpClient
  ) {
    // Listen for auth state changes
    this._authService.onDidAuthChange(async (isAuthenticated) => {
      if (this._view) {
        await this._updateView();
      }
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'login':
          await this._authService.login();
          break;
        case 'logout':
          await this._authService.logout();
          break;
        case 'openProject':
          // Handle opening a project
          break;
      }
    });

    // Set initial content
    this._updateView();
  }

  private async _updateView() {
    if (!this._view) {
      return;
    }

    const isAuthenticated = this._authService.isAuthenticated();
    const user = this._authService.getUser();

    if (!isAuthenticated) {
      // Show login screen
      this._view.webview.html = this._getLoginHtml();
      return;
    }

    try {
      // Fetch projects
      const projects = await this._httpClient.get<any[]>('/project/all');
      this._view.webview.html = this._getProjectsHtml(user?.username || '', projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      this._view.webview.html = this._getErrorHtml('Failed to load projects. Please try again.');
    }
  }

  private _getLoginHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeNexus - Login</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
        }
        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .login-btn {
            margin-top: 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        .login-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .title {
            font-size: 18px;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 14px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="title">CodeNexus</h2>
        <p class="subtitle">Sign in to access your projects and analyze your code</p>
        <button class="login-btn" id="login-btn">Sign In</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('login-btn').addEventListener('click', () => {
            vscode.postMessage({
                command: 'login'
            });
        });
    </script>
</body>
</html>`;
  }

  private _getProjectsHtml(username: string, projects: any[]) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeNexus - Projects</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
        }
        .container {
            display: flex;
            flex-direction: column;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .logout-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .logout-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .project-list {
            margin-top: 10px;
        }
        .project-item {
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            cursor: pointer;
        }
        .project-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .project-title {
            font-weight: bold;
        }
        .project-desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state {
            text-align: center;
            margin-top: 30px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span>Logged in as ${username}</span>
            <button class="logout-btn" id="logout-btn">Logout</button>
        </div>
        <div class="project-list">
            ${projects.length === 0 
              ? `<div class="empty-state">No projects found</div>` 
              : projects.map(project => `
                <div class="project-item" data-id="${project._id}">
                    <div class="project-title">${project.title}</div>
                    <div class="project-desc">${project.description || 'No description'}</div>
                </div>
              `).join('')}
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            vscode.postMessage({
                command: 'logout'
            });
        });
        
        document.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'openProject',
                    projectId: item.dataset.id
                });
            });
        });
    </script>
</body>
</html>`;
  }

  private _getErrorHtml(errorMessage: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeNexus - Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
        }
        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .error-message {
            color: var(--vscode-errorForeground);
            margin-bottom: 20px;
            text-align: center;
        }
        .retry-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        .retry-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <p class="error-message">${errorMessage}</p>
        <button class="retry-btn" id="retry-btn">Retry</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('retry-btn').addEventListener('click', () => {
            vscode.postMessage({
                command: 'refresh'
            });
        });
    </script>
</body>
</html>`;
  }
}