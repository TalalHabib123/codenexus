import * as vscode from 'vscode';
import { CodeResponse } from './types/api';
import { sendFileToServer } from './utils/api/ast_server';
import { traverseFolder } from './utils/codebase_analysis/folder_analysis';


const fileData: { [key: string]: CodeResponse } = {};

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    const processedFiles = context.workspaceState.get<{ [key: string]: string }>('processedFiles', {});
    const allFiles: { [key: string]: string } = { ...processedFiles };
    const newFiles: { [key: string]: string } = {};

    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            traverseFolder(folder.uri.fsPath, allFiles, newFiles);
        }
    }

    context.workspaceState.update('processedFiles', allFiles);
    const fileSendPromises = Object.entries(allFiles).map(([filePath, content]) => 
        sendFileToServer(filePath, content, fileData)
    );
    await Promise.all(fileSendPromises);

    const panel = vscode.window.createWebviewPanel(
        'fileList',
        'Workspace Files',
        vscode.ViewColumn.One,
        {}
    );
    panel.webview.html = getWebviewContent(fileData);
}

function getWebviewContent(fileData: { [key: string]: CodeResponse }): string {
    let content = '<html><body>';
    for (const [filePath, data] of Object.entries(fileData)) {
        content += `<h2>${filePath}</h2>`;
        if (data.success) {
            content += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        } else {
            content += `<pre style="color:red;">Error: ${data.error}</pre>`;
        }
    }
    content += '</body></html>';
    return content;
}


export function deactivate() { }
