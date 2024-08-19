import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
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

    const panel = vscode.window.createWebviewPanel(
        'fileList',
        'Workspace Files',
        vscode.ViewColumn.One,
        {}
    );

    panel.webview.html = getWebviewContent(allFiles);

    // for (const [filePath, content] of Object.entries(newFiles)) {
    //     sendFileToServer(filePath, content);
    // }
}

function traverseFolder(
    folderPath: string,
    allFiles: { [key: string]: string },
    newFiles: { [key: string]: string }
) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            traverseFolder(filePath, allFiles, newFiles);
        } else {
            if (filePath.includes('.py') && !filePath.includes('.pyc') && !allFiles[filePath]) {
                const content = fs.readFileSync(filePath, 'utf-8');
                allFiles[filePath] = content;
                newFiles[filePath] = content;
            }
        }
    }
}

function sendFileToServer(filePath: string, content: string) {
    const fileName = path.basename(filePath);
    axios.post('http://localhost:3000/upload', {
        fileName: fileName,
        content: content
    }).then(response => {
        console.log(`File ${fileName} sent successfully.`);
    }).catch(error => {
        console.error(`Failed to send file ${fileName}: `, error);
    });
}

function getWebviewContent(fileList: { [key: string]: string }): string {
    const fileListHtml = Object.entries(fileList).map(([filePath, content]) => `
        <li>
            <h2>${filePath}</h2>
            <pre>${content}</pre>
        </li>
    `).join('');
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Workspace Files</title>
        </head>
        <body>
            <h1>Workspace Files</h1>
            <ul>${fileListHtml}</ul>
        </body>
        </html>`;
}

export function deactivate() {}
