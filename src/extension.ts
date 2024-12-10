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
import { showCodeSmellsInProblemsTab } from './utils/ui/problemsTab';
import { detectedCodeSmells} from './utils/ui/problemsTab';
import { registerCodeActionProvider} from './utils/ui/DiagnosticAction';
import { ManualCodeProvider, ManualCodeItem } from './utils/ui/ManualCodeProvider';
import { refactor } from './codeSmells/refactor';

let ws: WebSocket | null = null;
const fileData: { [key: string]: CodeResponse } = {};
const FileDetectionData: { [key: string]: DetectionResponse } = {};
const folderStructureData: { [key: string]: FolderStructure } = {};

export async function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('codenexus');
    const showInline = config.get<boolean>('showInlineDiagnostics', false);
    console.log(`showInlineDiagnostics is set to: ${showInline}`);
   
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

    // Showing detected code smells in the Problems tab
    showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);

    fileWatcherEventHandler(context, fileData, FileDetectionData, dependencyGraph, folders,diagnosticCollection);
    const codeSmellsProvider = new CodeSmellsProvider();
    vscode.window.registerTreeDataProvider('package-outline', codeSmellsProvider);
    context.subscriptions.push(
        vscode.commands.registerCommand('package-explorer.refreshCodeSmells', () => codeSmellsProvider.refresh())
    );
  

      
      // Register the Code Action Provider
    registerCodeActionProvider(context);
      const runAnalysis = vscode.commands.registerCommand(
        'codenexus.runAnalysis',
        () => {
          vscode.window.showInformationMessage('Codenexus analysis started!');
          
        }
      );
    
      context.subscriptions.push(runAnalysis);
      const manualCodeProvider = new ManualCodeProvider();
      vscode.window.registerTreeDataProvider('manualCodeView', manualCodeProvider);
  
      context.subscriptions.push(
          vscode.commands.registerCommand('manualCodeView.toggleTick', (item: ManualCodeItem) => {
              manualCodeProvider.toggleCodeSmell(item);
          })
      );  
      const refactorCommand = vscode.commands.registerCommand(
        "extension.refactorProblem",
        async (diagnostic: vscode.Diagnostic) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage("No active editor found!");
                return;
            }

            const filePath = editor.document.uri.fsPath;
            try {
                // Send diagnostic to the backend
                const refactoredCode = await refactor(diagnostic, filePath, dependencyGraph, FileDetectionData);

                if (refactoredCode) {
                    // Apply the refactored code
                    await applyRefactoredCode(editor, diagnostic, refactoredCode);
                    vscode.window.showInformationMessage("Code refactored successfully!");
                } else {
                    vscode.window.showErrorMessage("Failed to get refactored code.");
                }
            } catch (error:any) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        }
    );

    context.subscriptions.push(refactorCommand);

    // Add a CodeActionProvider for diagnostics
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: "file", language: "python" },
            new DiagnosticRefactorProvider(),
            { providedCodeActionKinds: DiagnosticRefactorProvider.providedCodeActionKinds }
        )
    );
}


// Function to send diagnostic details to the backend
async function sendDiagnosticToBackend(diagnostic: vscode.Diagnostic, filePath: string) {
    return "askdnskfn";
    // try {
    //     const response = await axios.post("http://your-backend-url/refactor", {
    //         filePath: filePath,
    //         range: {
    //             startLine: diagnostic.range.start.line,
    //             startCharacter: diagnostic.range.start.character,
    //             endLine: diagnostic.range.end.line,
    //             endCharacter: diagnostic.range.end.character,
    //         },
    //         message: diagnostic.message,
    //     });

    //     return response.data.refactoredCode; // Assuming the backend sends this key
    // } catch (error) {
    //     console.error("Error sending diagnostic to backend:", error);
    //     throw error;
    // }    
}


// Function to replace problematic code with refactored code
async function applyRefactoredCode(editor: vscode.TextEditor, diagnostic: vscode.Diagnostic, refactoredCode: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(editor.document.uri, diagnostic.range, refactoredCode);
    await vscode.workspace.applyEdit(edit);
}

// A CodeActionProvider to attach icons to diagnostics
class DiagnosticRefactorProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        return context.diagnostics.map((diagnostic) => {
            console.log("Diagnostics added:", diagnostic);

            const action = new vscode.CodeAction("Fix this using codeNexus", vscode.CodeActionKind.QuickFix);
            action.command = {
                command: "extension.refactorProblem",
                title: "Fix this using codeNexus",
                arguments: [diagnostic],
            };
            action.diagnostics = [diagnostic];
            action.isPreferred = true;
            return action;
        });
    }
   

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

class CodeSmellsProvider implements vscode.TreeDataProvider<CodeSmellItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeSmellItem | undefined | void> = new vscode.EventEmitter<CodeSmellItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeSmellItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CodeSmellItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CodeSmellItem): Thenable<CodeSmellItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(Array.from(detectedCodeSmells).map(smell => new CodeSmellItem(smell)));
        }
    }
}

class CodeSmellItem extends vscode.TreeItem {
    constructor(public readonly label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}

