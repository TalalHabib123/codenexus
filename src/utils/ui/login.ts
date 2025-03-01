import * as vscode from "vscode";
import { BASE_URL } from "../api/api"; // Ensure BASE_URL is defined

export function login(context: vscode.ExtensionContext) {
    const provider = new AuthViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("authView", provider)
    );
}


class AuthViewProvider implements vscode.WebviewViewProvider {
    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.options = { enableScripts: true };

        webviewView.webview.html = this.getHtml();
        webviewView.webview.onDidReceiveMessage((message) => {
            if (message.command === "login") {
                vscode.env.openExternal(vscode.Uri.parse(BASE_URL));
            }
        });
    }

    private getHtml(): string {
        return `
            <html>
            <head>
                <style>
                    body {
                        display: flex;
                        justify-content: right;
                        align-items: top;
                        background-color: #1e1e1e;
                        color: white;
                        font-family: Arial, sans-serif;
                    }
                    #login-btn {
                        background-color: #007acc;
                        color: white;
                        font-size: 16px;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: background-color 0.3s;
                    }
                    #login-btn:hover {
                        background-color: #005f99;
                    }
                </style>
            </head>
            <body>
                <button id="login-btn">🔑 Login</button>
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById("login-btn").addEventListener("click", () => {
                        vscode.postMessage({ command: "login" });
                    });
                </script>
            </body>
            </html>
        `;
    }
    
}
