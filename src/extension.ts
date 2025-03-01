import * as vscode from 'vscode';
import { CodeResponse, DetectionResponse } from './types/api';
import { FileNode } from './types/graph';
import { FolderStructure } from './types/folder';
import { sendFileToServer } from './utils/api/ast_server';
import { traverseFolder, folderStructure } from './utils/codebase_analysis/folder_analysis';
import { buildDependencyGraph } from './utils/codebase_analysis/graph/dependency';
import { detectCodeSmells } from './codeSmells/detection';
import { fileWatcherEventHandler } from './utils/workspace-update/update';
import WebSocket from 'ws';
import { createFolderStructureProvider } from './utils/ui/problemsTab';
import { showCodeSmellsInProblemsTab } from './utils/ui/problemsTab';
import { detectedCodeSmells } from './utils/ui/problemsTab';
import { registerCodeActionProvider } from './utils/ui/DiagnosticAction';
import { ManualCodeProvider, ManualCodeItem } from './utils/ui/ManualCodeProvider';
import { createWebviewPanel, getWebviewContent } from './utils/ui/webviewast';
import { refactor } from './codeSmells/refactor';
import { establishWebSocketConnection } from './sockets/websockets';
import { CodeSmellsProvider } from './utils/ui/problemsTab';
import { RefactoringData } from './types/refactor_models';
import { userTriggeredcodesmell } from './utils/ui/problemsTab';
import { createFile, watchRulesetsFile } from './utils/workspace-update/rulesets';

let ws: WebSocket | null = null;
let fileData: { [key: string]: CodeResponse } = {};
let FileDetectionData: { [key: string]: DetectionResponse } = {};
let folderStructureData: { [key: string]: FolderStructure } = {};
let statusBarItem: vscode.StatusBarItem;
let diagnosticCollection = vscode.languages.createDiagnosticCollection('codeSmells');
let refactorData: { [key: string]: Array<RefactoringData> } = {};


export async function activate(context: vscode.ExtensionContext) {
    createFile(context);
    watchRulesetsFile(context);
    const config = vscode.workspace.getConfiguration('codenexus');
    const showInline = config.get<boolean>('showInlineDiagnostics', false);
    console.log(`showInlineDiagnostics is set to: ${showInline}`);
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBarItem);
   statusBarItem.text="CodeNexus intillaizing";
   statusBarItem.show();
   
    
    let dependencyGraph: { [key: string]: Map<string, FileNode> } = {};

    fileData = context.workspaceState.get<{ [key: string]: CodeResponse }>('fileData', {});
    FileDetectionData = context.workspaceState.get<{ [key: string]: DetectionResponse }>('FileDetectionData', {});
    folderStructureData = context.workspaceState.get<{ [key: string]: FolderStructure }>('folderStructureData', {});
    dependencyGraph = context.workspaceState.get<{ [key: string]: Map<string, FileNode> }>('dependencyGraph', {});
    refactorData = context.workspaceState.get<{ [key: string]: Array<RefactoringData> }>('refactorData', {});


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

    if (newFiles && Object.keys(newFiles).length > 0) {
        const fileSendPromises = Object.entries(newFiles).map(([filePath, content]) =>
            sendFileToServer(filePath, content, fileData)
        );
        await Promise.all(fileSendPromises);
        statusBarItem.text = "$(sync~spin) Dependency Graph in progress...";
        statusBarItem.show();
        dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);
        console.log("__________________DEPENDENCE GRAPH __________________");
        console.log(dependencyGraph);
        console.log("_____________________________________________________");

        statusBarItem.text = "$(sync~spin) Static Analysis in progress...";
        statusBarItem.show();
        await detectCodeSmells(dependencyGraph, fileData, folders, newFiles, FileDetectionData);
        // Show success message
        statusBarItem.text = "$(check) Analysis complete";
        statusBarItem.show();

        // Hide after 2 seconds
        setTimeout(() => {
            statusBarItem.hide();
        }, 2000);
        // Save all the data 
        context.workspaceState.update('processedFiles', allFiles);
        context.workspaceState.update('fileData', fileData);
        context.workspaceState.update('FileDetectionData', FileDetectionData);
        context.workspaceState.update('folderStructureData', folderStructureData);
        context.workspaceState.update('dependencyGraph', dependencyGraph);
    }

    // // Comment From Here
    // const fileSendPromises = Object.entries(allFiles).map(([filePath, content]) =>
    //     sendFileToServer(filePath, content, fileData)
    // );
    // await Promise.all(fileSendPromises);

    // dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);
    // console.log("__________________DEPENDENCE GRAPH __________________")
    // console.log(dependencyGraph);
    // console.log("_____________________________________________________")
    // // establishWebSocketConnection(ws, fileData, FileDetectionData, 'detection', 'god_object');

    // await detectCodeSmells(dependencyGraph, fileData, folders, allFiles, FileDetectionData);
    // // Test Connection

    // context.workspaceState.update('processedFiles', allFiles);
    // context.workspaceState.update('fileData', fileData);
    // context.workspaceState.update('FileDetectionData', FileDetectionData);
    // context.workspaceState.update('folderStructureData', folderStructureData);
    // Till Here

    dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);
    context.workspaceState.update('dependencyGraph', dependencyGraph);

    console.log("__________________DEPENDENCE GRAPH __________________");
    console.log(dependencyGraph);
    console.log("_____________________________________________________");
    console.log("__________________FILE DATA __________________");
    console.log(fileData);
    console.log("_____________________________________________________");
    console.log("__________________FILE DETECTION DATA __________________");
    console.log(FileDetectionData);
    console.log("_____________________________________________________");
    console.log("__________________FOLDER STRUCTURE DATA __________________");
    console.log(folderStructureData);
    console.log("_____________________________________________________");
    statusBarItem.text = "$(check) Analysis complete.Populating Problems Tab...";
    statusBarItem.show();

    // Showing detected code smells in the Problems tab
    showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);
    // Hide after 2 seconds
    setTimeout(() => {
        statusBarItem.hide();
    }, 2000);
    fileWatcherEventHandler(context, fileData, FileDetectionData, dependencyGraph, folders, diagnosticCollection);
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
    const manualCodeProvider = new ManualCodeProvider(context);
    vscode.window.registerTreeDataProvider('manualCodeView', manualCodeProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('manualCodeView.toggleTick', (item: ManualCodeItem) => {
            manualCodeProvider.toggleCodeSmell(item);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('codenexus.showAST', async () => {
            dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);
            createWebviewPanel(context, dependencyGraph);
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
                const refactoredCode = await refactor(diagnostic, filePath, dependencyGraph, FileDetectionData, refactorData);
                console.log("__________________REFRACTORED CODE __________________");
                console.log(refactoredCode);
                console.log("_____________________________________________________");

                if (refactoredCode) {

                    await applyRefactoredCode(editor, refactoredCode.refactored_code);
                    vscode.window.showInformationMessage("Code refactored successfully!");

                    RefreshDetection(context, folders, allFiles);
                    removeDiagnostic(filePath, diagnostic);
                   
                    context.workspaceState.update('FileDetectionData', FileDetectionData);
                    context.workspaceState.update('refactorData', refactorData);
                    
                } else {
                    vscode.window.showErrorMessage("Failed to get refactored code.");
                }
            } catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                } else {
                    vscode.window.showErrorMessage('An unknown error occurred.');
                }
            }
        }
    );
    statusBarItem.text = "$(check) Analysis complete";
    statusBarItem.show();
    //push staticBarItem to context.subscriptions
    context.subscriptions.push(statusBarItem);

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


async function RefreshDetection(context: vscode.ExtensionContext, folders: string[], allFiles: { [key: string]: string }) {
    let dependencyGraph: { [key: string]: Map<string, FileNode> } = {};
    await detectCodeSmells(dependencyGraph, fileData, folders, allFiles, FileDetectionData);

}

function removeDiagnostic(filePath: string, diagnostic: vscode.Diagnostic): void {
    // Convert filePath string to vscode.Uri
    const uri = vscode.Uri.file(filePath);

    // Retrieve diagnostics for the given URI
    const diagnostics = diagnosticCollection.get(uri);
    if (!diagnostics) {
        console.warn(`No diagnostics found for file: ${filePath}`);
        return;
    }

    // Find the index of the diagnostic to remove
    const index = diagnostics.findIndex(
        (diag) => diag.message === diagnostic.message && diag.range.isEqual(diagnostic.range)
    );

    if (index !== -1) {
        // Create a new array excluding the diagnostic to remove
        const updatedDiagnostics = diagnostics.filter((_, i) => i !== index);

        // Update the diagnostic collection with the new array
        diagnosticCollection.set(uri, updatedDiagnostics);

        vscode.window.showInformationMessage(`Diagnostic for "${diagnostic.message}" removed.`);
    } else {
        console.warn("No matching diagnostic found to remove.");
    }
}
// Function to replace the entire content of the file with refactored code
async function applyRefactoredCode(editor: vscode.TextEditor, refactoredCode: string) {
    const edit = new vscode.WorkspaceEdit();
    const document = editor.document;
    const firstLine = document.lineAt(0);
    const lastLine = document.lineAt(document.lineCount - 1);
    const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
    edit.replace(document.uri, fullRange, refactoredCode);
    await vscode.workspace.applyEdit(edit);
}

class DiagnosticRefactorProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        // Filter diagnostics that match the selected range
        const matchingDiagnostics = context.diagnostics.filter(
            (diagnostic) => diagnostic.range.intersection(range) !== undefined
        );

        if (matchingDiagnostics.length === 0) {
            return undefined; // No relevant diagnostics found
        }

                // Map filtered diagnostics to specific code actions
        return matchingDiagnostics.map((diagnostic) => {
            
        
            // Create a descriptive title for the Code Action using template literals
            const actionTitle = `Fix "${diagnostic.message}" using codeNexus`;
        
            // Initialize the Code Action with the dynamic title
            const action = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);
        
            // Assign the command to be execruted when the Code Action is selected
            action.command = {
                command: "extension.refactorProblem",
                title: "Fix this using codeNexus", // This title won't appear in the Quick Fix menu
                arguments: [diagnostic], // Pass the specific diagnostic to the command
            };
        
            // Associate the diagnostic with this Code Action
            action.diagnostics = [diagnostic];
        
            // Optionally mark this as the preferred fix (if applicable)
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





export function triggerCodeSmellDetection(
    codeSmell: string,
    context: vscode.ExtensionContext
): void {

    establishWebSocketConnection(codeSmell, ws, fileData, FileDetectionData, 'detection', codeSmell, diagnosticCollection, context);
    console.log("HELLLOO ME HERE");
    if (! (!ws || ws.readyState !== WebSocket.OPEN)) {
        console.log("websocket state: ", ws.readyState);
        console.log("__________________FILE DETECTION DATA in trigger __________________");   
        console.log(FileDetectionData);
        console.log("_____________________________________________________");
    }
}
