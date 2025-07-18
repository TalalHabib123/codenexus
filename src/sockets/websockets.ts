import WebSocket from 'ws';
import * as vscode from 'vscode';
import * as path from 'path';
import { CodeResponse, DetectionResponse, UserTriggeredDetectionResponse, UserTriggeredDetection } from '../types/api';
import { taskDataGenerator as detectionTaskDataGenerator } from './detections/generate_task_data';
import { detectionHelper } from './detections/detection_helper';
import { refactoringHelper, refactoringMappingHelper } from './refactorings/refactoring_helper';
import { codeMapper } from './refactorings/code_mapper';
import { taskDataGenerator as refactoringDataGenerator } from './refactorings/generate_task_data';
import { showCodeSmellsInProblemsTab } from '../utils/ui/problemsTab';
import { userTriggeredcodesmell } from '../utils/ui/problemsTab';
import { sendFileToServer } from '../utils/api/ast_server';
import { buildDependencyGraph } from '../utils/codebase_analysis/graph/dependency';
import { detectCodeSmells } from '../codeSmells/detection';
import { FolderStructure } from '../types/folder';
import { Rules } from '../types/rulesets';
import { RefactoringData } from '../types/refactor_models';
import { detectionLog } from '../utils/api/log_api/detection_logs';
import { refactorLogs } from '../utils/api/log_api/refactor_logs';
import { saveFileData } from '../utils/api/file_data_api';
let statusBarItem: vscode.StatusBarItem;


export function activate(context: vscode.ExtensionContext) {
    // Create status bar if it doesn't exist
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBarItem);
}
export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}

// Helper function to ensure status bar exists
function getStatusBar(): vscode.StatusBarItem {
    if (!statusBarItem) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    }
    statusBarItem.show(); // Always show when getting status bar
    return statusBarItem;
}

function sendMessage(
    ws: WebSocket | null,
    taskData: { [key: string]: string },
    taskType: string,
    taskJob: string,
) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        vscode.window.showErrorMessage('WebSocket connection is not established.');
        return;
    }

    ws.send(JSON.stringify({
        task: taskType,
        data: taskData,
        job: taskJob,
    }));
}

function establishWebSocketConnection(codeSmell: string,
    ws: WebSocket | null = null,
    fileData: { [key: string]: CodeResponse },
    FileDetectionData: { [key: string]: DetectionResponse },
    folderStructureData: { [key: string]: FolderStructure },
    rulesetsData: Rules,
    taskType: string,
    taskJob: string,
    diagnosticCollection: vscode.DiagnosticCollection,
    context: vscode.ExtensionContext,
    file: string = '',
    additonalData: any = null,
    refactorData: { [key: string]: Array<RefactoringData> } = {},
) {

    let taskData;
    if (taskType === 'detection') {
        taskData = detectionTaskDataGenerator(fileData, taskType, detectionHelper[taskJob]);
    }
    else if (taskType === 'refactoring') {
        taskData = refactoringDataGenerator(fileData, refactoringHelper[taskJob], file, additonalData);
    }
    if (!taskData || Object.keys(taskData).length === 0) {
        vscode.window.showErrorMessage('No data to send for Analysis.');
        return;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        vscode.window.showInformationMessage('Establishing WebSocket connection...');
        ws = new WebSocket('ws://127.0.0.1:8000/websockets/');
        ws.on('open', () => {
            vscode.window.showInformationMessage('WebSocket connected to API Gateway.');
            sendMessage(ws, taskData, taskType, taskJob);
        });

        ws.on('message', async (data: string) => {
            try {
                const status = getStatusBar();
                const message: UserTriggeredDetectionResponse = JSON.parse(data);
                const detectionData: { [key: string]: DetectionResponse } = {};
                //console.log('Received message:', message);
                if (message.task_status === 'started') {
                    status.text = "$(sync~spin) Analysis in progress...";
                    status.show();
                }
                if (message.task_status === 'success') {
                    console.log("HELDJIWJDIJWIJDIW");
                    status.text = "$(check) Analysis complete:Data processed";
                    status.show();
                    vscode.window.showInformationMessage(`Task completed`);
                    if (message.processed_data) {
                        if (message.task_type === 'detection') {
                            for (const [file, data] of Object.entries(message.processed_data)) {
                                if (typeof data === 'string') {
                                    continue;
                                }
                                const newTriggerData: UserTriggeredDetection = {
                                    data: data,
                                    time: new Date(),
                                    analysis_type: taskType,
                                    job_id: taskJob,
                                    outdated: false,
                                    success: true,
                                    error: '',
                                };
                                if (!FileDetectionData[file].user_triggered_detection) {
                                    console.log("FileDetectionData[file].user_triggered_detection is undefined, initializing it as an empty array.");
                                    FileDetectionData[file].user_triggered_detection = [];
                                    
                                }
                                else {
                                    for (let i = 0; i < FileDetectionData[file].user_triggered_detection.length; i++) {
                                        if (FileDetectionData[file].user_triggered_detection[i].job_id === taskJob) {
                                            FileDetectionData[file].user_triggered_detection[i].outdated = true;
                                        }
                                    }
                                }
                                console.log(newTriggerData);
                                console.log("__________________FILE DETECTION DATA in trigger __________________");
                                FileDetectionData[file].user_triggered_detection.push(newTriggerData);
                                console.log(FileDetectionData);
                                console.log("_____________________________________________________");
                                console.log("__________________FILE DETECTION DATA in trigger __________________");
                                // logs for manual detection
                                const workspace = vscode.workspace.workspaceFolders;
                                if (workspace === undefined) {
                                    throw new Error('No workspace folders found');
                                }
                                if (!detectionData[file]){
                                    detectionData[file] = { success: false };
                                }
                                    
                                if(!detectionData[file].user_triggered_detection){
                                    detectionData[file].user_triggered_detection = [];
                                }
                                detectionData[file].user_triggered_detection.push(newTriggerData);
                                detectionLog(detectionData, path.basename(workspace[0].uri.fsPath), codeSmell, 'manual');
                            }
                            console.log("__________________FILE DETECTION DATA in trigger __________________");
                            console.log(FileDetectionData);
                            console.log("_____________________________________________________");
                           
                            // showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);
                            userTriggeredcodesmell(codeSmell, FileDetectionData, diagnosticCollection, context);
                            vscode.window.showInformationMessage(`Problems updated for: ${taskJob}`);
                            context.workspaceState.update('FileDetectionData', FileDetectionData);
                        }

                        else if (message.task_type === 'refactoring') {
                            vscode.window.showInformationMessage(`Refactoring completed for: ${taskJob}`);
                            const refactoredData = message.processed_data.code_snippet;
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                            const folders = workspaceFolders?.map(folder => folder.uri.fsPath) || [];
                            let files: { [key: string]: string; } = {};
                            const processedFiles = context.workspaceState.get<{ [key: string]: string }>('processedFiles', {});
                            if (refactoredData && typeof refactoredData === 'string') {
                                if (codeMapper(refactoredData, file)) {
                                    if (!refactorData[file]) {
                                        refactorData[file] = [];
                                    }
                                    if (refactorData[file].length > 0) {
                                        for (let i = 0; i < refactorData[file].length; i++) {
                                            if (refactorData[file][i].refactoring_type === taskJob) {
                                                refactorData[file][i].outdated = true;
                                            }
                                        }
                                    }   
                                    refactorData[file].push({
                                        orginal_code: fileData[file].code,
                                        refactored_code: refactoredData,
                                        refactoring_type: taskJob,  
                                        time: new Date(),
                                        job_id: message.correlation_id,
                                        success: true,
                                        outdated: false,
                                    });
                                    const additionalData = message.processed_data.additional_data ?? undefined;
                                    if (additionalData && typeof additionalData === 'object') {
                                        for (const [file_path_add, refactored_code_add] of Object.entries(additionalData)) {
                                            if (refactored_code_add && typeof refactored_code_add==='string' 
                                                    && codeMapper(refactored_code_add, file_path_add)) {
                                                files[file_path_add] = refactored_code_add;
                                                if (!refactorData[file_path_add]) {
                                                    refactorData[file_path_add] = [];
                                                }
                                                if (refactorData[file_path_add].length > 0) {
                                                    for (let i = 0; i < refactorData[file_path_add].length; i++) {
                                                        if (refactorData[file_path_add][i].refactoring_type === taskJob) {
                                                            refactorData[file_path_add][i].outdated = true;
                                                        }
                                                    }
                                                }
                                                refactorData[file_path_add].push({
                                                    orginal_code: fileData[file_path_add].code,
                                                    refactored_code: refactored_code_add,
                                                    refactoring_type: taskJob,
                                                    time: new Date(),
                                                    job_id: message.correlation_id,
                                                    success: true,
                                                    outdated: false,
                                                });
                                                files[file_path_add] = refactored_code_add;
                                                processedFiles[file_path_add] = refactored_code_add;
                                            }
                                        }
                                    }
                                    if (refactoringMappingHelper[taskJob] === "default") {
                                        files[file] = refactoredData;
                                        const fileSendPromises = Object.entries(files).map(([filePath, content]) =>
                                            sendFileToServer(filePath, content, fileData)
                                        );
                                        await Promise.all(fileSendPromises);
                                        let dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);
                                        await detectCodeSmells(dependencyGraph, fileData, folders, files, FileDetectionData, rulesetsData, context);
                                        
                                        context.workspaceState.update('fileData', fileData);
                                        context.workspaceState.update('FileDetectionData', FileDetectionData);
                                        context.workspaceState.update('dependencyGraph', dependencyGraph);
                                        const processedFiles = context.workspaceState.get<{ [key: string]: string }>('processedFiles', {});
                                        processedFiles[file] = refactoredData;
                                        context.workspaceState.update('processedFiles', processedFiles);
                                         if (fileData && Object.keys(fileData).length > 0) {
                                            saveFileData(path.basename(vscode.workspace.workspaceFolders?.[0].uri.fsPath || " "), fileData); 
                                        }
                                    }
                                    processedFiles[file] = refactoredData;
                                    context.workspaceState.update('processedFiles', processedFiles);
                                    context.workspaceState.update('refactorData', refactorData);
                                    try {
                                        await (vscode.commands.executeCommand('codenexus.refreshRefactorHistory') as Promise<void>);
                                    } catch (error: any) {
                                        vscode.window.showErrorMessage(`Error executing command: ${error.message}`);
                                    }
                                }
                            }
                        }
                    }

                    setTimeout(() => {
                        status.hide();
                    }, 3000);
                }
                else if (message.task_status === 'task_failed') {//loading state error
                    status.text = "$(error) Analysis failed";
                    status.show();
                    vscode.window.showErrorMessage(`Task failed: ${message.error}`);
                    setTimeout(() => {
                        status.hide();
                    }, 3000);
                }
                else if (message.task_status === 'task_started') {//loading state
                    status.text = "$(error) Task Started";
                    vscode.window.showInformationMessage(`Task started: ${message.correlation_id}`);
                }
                else {
                    status.text = "$(error) Task failed";
                    vscode.window.showErrorMessage(`Task failed: ${message.task_status}`);
                    status.hide();//errorloading state stopped
                }
            } catch (error) {
                const status = getStatusBar();
                status.text = "$(error) Message parsing failed";
                status.show();
                setTimeout(() => {
                    status.hide();
                }, 3000);
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`WebSocket error: ${error.message}`);
                    console.error(error);
                } else {
                    vscode.window.showErrorMessage(`WebSocket error: ${String(error)}`);
                    console.error(error);
                }
            }
        });

        ws.on('error', (err) => {
            vscode.window.showErrorMessage(`WebSocket error: ${err.message}`);
        });

        ws.on('close', () => {
            vscode.window.showInformationMessage('WebSocket connection closed.');
        });
    }
    else {
        vscode.window.showInformationMessage('WebSocket connection is already established.');
        return;
    }
}

export { establishWebSocketConnection };