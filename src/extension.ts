import * as vscode from 'vscode';
import { CodeResponse, DetectionResponse } from './types/api';
import { FolderStructure } from './types/folder';
import { sendFileToServer, detection_api } from './utils/api/ast_server';
import { traverseFolder, folderStructure } from './utils/codebase_analysis/folder_analysis';
import { buildDependencyGraph } from './utils/codebase_analysis/graph/dependency';
import { detectCodeSmells } from './codeSmells/detection';
import WebSocket from 'ws';

let ws: WebSocket | null = null;


const fileData: { [key: string]: CodeResponse } = {};
const FileDetectionData: { [key: string]: DetectionResponse } = {};
const folderStructureData: { [key: string]: FolderStructure } = {};

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    const processedFiles = context.workspaceState.get<{ [key: string]: string }>('processedFiles', {});
    const folders = workspaceFolders?.map(folder => folder.uri.fsPath) || [];
    const allFiles: { [key: string]: string } = { ...processedFiles };
    const newFiles: { [key: string]: string } = {};

    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            traverseFolder(folder.uri.fsPath, allFiles, newFiles);
            folderStructureData[folder.uri.fsPath] = folderStructure(folder.uri.fsPath);
        }
    }

    context.workspaceState.update('processedFiles', allFiles);

    const fileSendPromises = Object.entries(allFiles).map(([filePath, content]) =>
        sendFileToServer(filePath, content, fileData)
    );
    await Promise.all(fileSendPromises);

    const dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);
    // console.log(dependencyGraph);

    // const detectionTasksPromises = Object.entries(allFiles).map(([filePath, content]) =>
    //     detection_api(filePath, content, fileData, FileDetectionData)
    // );

    // await Promise.all(detectionTasksPromises);
    // await detectCodeSmells(dependencyGraph, fileData, folders, allFiles, FileDetectionData);
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


export function deactivate() { 
    if (ws) {
        ws.close();
        ws = null;
    }
}


// Event handler functions
const fileWatcherEventHandler = (context: vscode.ExtensionContext) => {
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);

    fileWatcher.onDidCreate(uri => {
        console.log(`File created: ${uri.fsPath}`);
    });

    fileWatcher.onDidDelete(uri => {
        console.log(`File deleted: ${uri.fsPath}`);
    });

    fileWatcher.onDidChange(uri => {
        console.log(`File changed: ${uri.fsPath}`);
    });
    context.subscriptions.push(fileWatcher);
};

function establishWebSocketConnection() {
    // Establish WebSocket connection to the API Gateway
    ws = new WebSocket('ws://127.0.0.1:8000/websockets/');

    ws.on('open', () => {
        vscode.window.showInformationMessage('WebSocket connected to API Gateway.');
        testWebSocketConnection();
    });

    ws.on('message', (data: string) => {
        const message = JSON.parse(data);
        console.log('Received message:', message);

        if (message.status === 'task_completed') {
            vscode.window.showInformationMessage(`Task completed: ${message.processed_data}`);
        }
    });

    ws.on('error', (err) => {
        vscode.window.showErrorMessage(`WebSocket error: ${err.message}`);
    });

    ws.on('close', () => {
        vscode.window.showWarningMessage('WebSocket connection closed. Reconnecting...');
        // Attempt to reconnect after a delay
        setTimeout(() => {
            establishWebSocketConnection();
        }, 5000); // 5 seconds delay
    });
}

function testWebSocketConnection() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        vscode.window.showErrorMessage('WebSocket connection is not established.');
        return;
    }

    const taskData = 'Sample code to analyze...';
    const taskType = 'detect_smells';

    ws.send(JSON.stringify({
        task: taskType,
        data: taskData
    }));
}
