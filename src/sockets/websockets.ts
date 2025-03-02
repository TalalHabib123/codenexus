import WebSocket from 'ws';
import * as vscode from 'vscode';
import { CodeResponse, DetectionResponse, UserTriggeredDetectionResponse, UserTriggeredDetection } from '../types/api';
import { taskDataGenerator as detectionTaskDataGenerator } from './detections/generate_task_data';
import { detectionHelper } from './detections/detection_helper';
import { refactoringHelper } from './refactorings/refactoring_helper';
import { codeMapper } from './refactorings/code_mapper';
import { taskDataGenerator as refactoringDataGenerator } from './refactorings/generate_task_data';
import { showCodeSmellsInProblemsTab } from '../utils/ui/problemsTab';
import { userTriggeredcodesmell } from '../utils/ui/problemsTab';
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
    taskType: string,
    taskJob: string,
    diagnosticCollection: vscode.DiagnosticCollection,
    context: vscode.ExtensionContext,
    file: string = '',
    additonalData: any = null,
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

        ws.on('message', (data: string) => {
            try {
                const status = getStatusBar();
                const message: UserTriggeredDetectionResponse = JSON.parse(data);
                //console.log('Received message:', message);
                if (message.task_status === 'started') {
                    status.text = "$(sync~spin) Analysis in progress...";
                    status.show();
                }
                if (message.task_status === 'success') {
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
                                    FileDetectionData[file].user_triggered_detection = [];
                                }
                                else {
                                    for (let i = 0; i < FileDetectionData[file].user_triggered_detection.length; i++) {
                                        if (FileDetectionData[file].user_triggered_detection[i].job_id === taskJob) {
                                            FileDetectionData[file].user_triggered_detection[i].outdated = true;
                                        }
                                    }
                                }

                                FileDetectionData[file].user_triggered_detection.push(newTriggerData);
                            }
                            console.log("__________________FILE DETECTION DATA in trigger __________________");
                            console.log(FileDetectionData);
                            console.log("_____________________________________________________");
                            // showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);
                            userTriggeredcodesmell(codeSmell, FileDetectionData, diagnosticCollection);
                            vscode.window.showInformationMessage(`Problems updated for: ${taskJob}`);
                            context.workspaceState.update('FileDetectionData', FileDetectionData);
                        }

                        else if (message.task_type === 'refactoring') {
                            vscode.window.showInformationMessage(`Refactoring completed for: ${taskJob}`);
                            const refactoredData = message.processed_data.code_snippet;
                            if (refactoredData && typeof refactoredData === 'string') {
                                codeMapper(refactoredData, file);
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