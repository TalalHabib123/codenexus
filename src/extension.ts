import * as vscode from 'vscode';
import { CodeResponse, DetectionResponse } from './types/api';
import { FolderStructure } from './types/folder';
import { sendFileToServer } from './utils/api/ast_server';
import { traverseFolder, folderStructure } from './utils/codebase_analysis/folder_analysis';
import { buildDependencyGraph } from './utils/codebase_analysis/graph/dependency';
import { detectCodeSmells } from './codeSmells/detection';
import { fileWatcherEventHandler } from './utils/workspace-update/update';
import WebSocket from 'ws';
import { createFolderStructureProvider } from './utils/ui/problemsTab';
import { LongParameterListResponse } from './types/api';

let ws: WebSocket | null = null;
const fileData: { [key: string]: CodeResponse } = {};
const FileDetectionData: { [key: string]: DetectionResponse } = {};
const folderStructureData: { [key: string]: FolderStructure } = {};

export async function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('codeSmells');
    context.subscriptions.push(diagnosticCollection);

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
    const workspaceRoot = vscode.workspace.rootPath;
    const folderStructureProvider = createFolderStructureProvider(workspaceRoot);
    vscode.window.registerTreeDataProvider('myFolderStructureView', folderStructureProvider);

    const fileSendPromises = Object.entries(allFiles).map(([filePath, content]) =>
        sendFileToServer(filePath, content, fileData)
    );
    await Promise.all(fileSendPromises);

    const dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);
    await detectCodeSmells(dependencyGraph, fileData, folders, allFiles, FileDetectionData);

    // Show detected code smells in the Problems tab
    showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);

    fileWatcherEventHandler(context, fileData, FileDetectionData, dependencyGraph, folders);
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

function establishWebSocketConnection() {
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
        setTimeout(() => {
            establishWebSocketConnection();
        }, 5000);
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

function showCodeSmellsInProblemsTab(
    FileDetectionData: { [key: string]: DetectionResponse },
    diagnosticCollection: vscode.DiagnosticCollection
) {
    diagnosticCollection.clear();

    for (const [filePath, detectionData] of Object.entries(FileDetectionData)) {
        const diagnostics: vscode.Diagnostic[] = [];

        if (detectionData.long_parameter_list?.success && detectionData.long_parameter_list.data && 'long_parameter_list' in detectionData.long_parameter_list.data) {
            const longparameter =  detectionData.long_parameter_list.data.long_parameter_list;
            if (longparameter) {
                longparameter.forEach(longparameterobj => {
            if(longparameterobj.long_parameter==true){
                const range = new vscode.Range(
                    new vscode.Position(longparameterobj.line_number - 1, 0), 
                    new vscode.Position(longparameterobj.line_number - 1, 100) 
                );
                const message = `Long parameter list detected: ${longparameterobj.function_name} with ${longparameterobj.long_parameter_count} parameters`;
                diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
                console.log("longparameter:", longparameter);
            }
        }
        );
        }
    }
    if (detectionData.magic_numbers?.success && detectionData.magic_numbers.data && 'magic_numbers' in detectionData.magic_numbers.data) {
        const magicNumber =  detectionData.magic_numbers.data.magic_numbers;
        if (magicNumber) {
            magicNumber.forEach(magicNumberobj => {
            const range = new vscode.Range(
                new vscode.Position(magicNumberobj.line_number - 1, 0), 
                new vscode.Position(magicNumberobj.line_number - 1, 100) 
            );
            const message = `Magic number detected: ${magicNumberobj.magic_number}`;
                diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
        }
        );
        }
    }
    // if (detectionData.magic_numbers?.success && detectionData.magic_numbers.data && 'magic_numbers' in detectionData.magic_numbers.data) {
    //     const magicNumber =  detectionData.magic_numbers.data.magic_numbers;
    //     if (magicNumber) {
    //         magicNumber.forEach(magicNumberobj => {
    //         const range = new vscode.Range(
    //             new vscode.Position(magicNumberobj.line_number - 1, 0), 
    //             new vscode.Position(magicNumberobj.line_number - 1, 100) 
    //         );
    //         const message = `Magic number detected: ${magicNumberobj.magic_number}`;
    //             diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
    //     }
    //     );
    //     }
    // }



        const uri = vscode.Uri.file(filePath);
        diagnosticCollection.set(uri, diagnostics);
    
}
}
