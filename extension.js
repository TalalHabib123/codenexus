"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) {return mod;}
    var result = {};
    if (mod != null) {
        for (var k in mod) {if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) {
            __createBinding(result, mod, k);
        }}
    }
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.triggerCodeSmellDetection = triggerCodeSmellDetection;
const vscode = __importStar(require("vscode"));
const ast_server_1 = require("./utils/api/ast_server");
const folder_analysis_1 = require("./utils/codebase_analysis/folder_analysis");
const dependency_1 = require("./utils/codebase_analysis/graph/dependency");
const detection_1 = require("./codeSmells/detection");
const update_1 = require("./utils/workspace-update/update");
const ws_1 = __importDefault(require("ws"));
const problemsTab_1 = require("./utils/ui/problemsTab");
const problemsTab_2 = require("./utils/ui/problemsTab");
const DiagnosticAction_1 = require("./utils/ui/DiagnosticAction");
const ManualCodeProvider_1 = require("./utils/ui/ManualCodeProvider");
const webviewast_1 = require("./utils/ui/webviewast");
const refactor_1 = require("./codeSmells/refactor");
const websockets_1 = require("./sockets/websockets");
const problemsTab_3 = require("./utils/ui/problemsTab");
const rulesets_1 = require("./utils/workspace-update/rulesets");
let ws = null;
let fileData = {};
let FileDetectionData = {};
let folderStructureData = {};
let statusBarItem;
let diagnosticCollection = vscode.languages.createDiagnosticCollection('codeSmells');
let refactorData = {};

async function activate(context) {
    (0, rulesets_1.createFile)(context);
    (0, rulesets_1.watchRulesetsFile)(context);
    const config = vscode.workspace.getConfiguration('codenexus');
    const showInline = config.get('showInlineDiagnostics', false);
    console.log(`showInlineDiagnostics is set to: ${showInline}`);
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBarItem);
    statusBarItem.text = "CodeNexus intillaizing";
    statusBarItem.show();
    let dependencyGraph = {};
    fileData = context.workspaceState.get('fileData', {});
    FileDetectionData = context.workspaceState.get('FileDetectionData', {});
    folderStructureData = context.workspaceState.get('folderStructureData', {});
    dependencyGraph = context.workspaceState.get('dependencyGraph', {});
    refactorData = context.workspaceState.get('refactorData', {});
    context.subscriptions.push(diagnosticCollection);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const processedFiles = context.workspaceState.get('processedFiles', {});
    const folders = workspaceFolders?.map(folder => folder.uri.fsPath) || [];
    const allFiles = { ...processedFiles };
    const newFiles = {};
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            (0, folder_analysis_1.traverseFolder)(folder.uri.fsPath, allFiles, newFiles);
            folderStructureData[folder.uri.fsPath] = (0, folder_analysis_1.folderStructure)(folder.uri.fsPath);
        }
    }
    context.workspaceState.update('processedFiles', allFiles);
    const workspaceRoot = vscode.workspace.rootPath;
    const folderStructureProvider = (0, problemsTab_1.createFolderStructureProvider)(workspaceRoot);
    vscode.window.registerTreeDataProvider('myFolderStructureView', folderStructureProvider);
    if (newFiles && Object.keys(newFiles).length > 0) {
        const fileSendPromises = Object.entries(newFiles).map(([filePath, content]) => (0, ast_server_1.sendFileToServer)(filePath, content, fileData));
        await Promise.all(fileSendPromises);
        statusBarItem.text = "$(sync~spin) Dependency Graph in progress...";
        statusBarItem.show();
        dependencyGraph = (0, dependency_1.buildDependencyGraph)(fileData, folderStructureData, folders);
        console.log("__________________DEPENDENCE GRAPH __________________");
        console.log(dependencyGraph);
        console.log("_____________________________________________________");
        statusBarItem.text = "$(sync~spin) Static Analysis in progress...";
        statusBarItem.show();
        await (0, detection_1.detectCodeSmells)(dependencyGraph, fileData, folders, newFiles, FileDetectionData);
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
    dependencyGraph = (0, dependency_1.buildDependencyGraph)(fileData, folderStructureData, folders);
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
    (0, problemsTab_2.showCodeSmellsInProblemsTab)(FileDetectionData, diagnosticCollection);
    // Hide after 2 seconds
    setTimeout(() => {
        statusBarItem.hide();
    }, 2000);
    (0, update_1.fileWatcherEventHandler)(context, fileData, FileDetectionData, dependencyGraph, folders, diagnosticCollection);
    const codeSmellsProvider = new problemsTab_3.CodeSmellsProvider();
    vscode.window.registerTreeDataProvider('package-outline', codeSmellsProvider);
    context.subscriptions.push(vscode.commands.registerCommand('package-explorer.refreshCodeSmells', () => codeSmellsProvider.refresh()));
    // Register the Code Action Provider
    (0, DiagnosticAction_1.registerCodeActionProvider)(context);
    const runAnalysis = vscode.commands.registerCommand('codenexus.runAnalysis', () => {
        vscode.window.showInformationMessage('Codenexus analysis started!');
    });
    context.subscriptions.push(runAnalysis);
    const manualCodeProvider = new ManualCodeProvider_1.ManualCodeProvider(context);
    vscode.window.registerTreeDataProvider('manualCodeView', manualCodeProvider);
    context.subscriptions.push(vscode.commands.registerCommand('manualCodeView.toggleTick', (item) => {
        manualCodeProvider.toggleCodeSmell(item);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codenexus.showAST', async () => {
        dependencyGraph = (0, dependency_1.buildDependencyGraph)(fileData, folderStructureData, folders);
        (0, webviewast_1.createWebviewPanel)(context, dependencyGraph);
    }));
    const refactorCommand = vscode.commands.registerCommand("extension.refactorProblem", async (diagnostic) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found!");
            return;
        }
        const filePath = editor.document.uri.fsPath;
        try {
            // Send diagnostic to the backend
            const refactoredCode = await (0, refactor_1.refactor)(diagnostic, filePath, dependencyGraph, FileDetectionData, refactorData);
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
            }
            else {
                vscode.window.showErrorMessage("Failed to get refactored code.");
            }
        }
        catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
            else {
                vscode.window.showErrorMessage('An unknown error occurred.');
            }
        }
    });
    statusBarItem.text = "$(check) Analysis complete";
    statusBarItem.show();
    //push staticBarItem to context.subscriptions
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(refactorCommand);
    // Add a CodeActionProvider for diagnostics
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: "file", language: "python" }, new DiagnosticRefactorProvider(), { providedCodeActionKinds: DiagnosticRefactorProvider.providedCodeActionKinds }));
}
async function RefreshDetection(context, folders, allFiles) {
    let dependencyGraph = {};
    await (0, detection_1.detectCodeSmells)(dependencyGraph, fileData, folders, allFiles, FileDetectionData);
}
function removeDiagnostic(filePath, diagnostic) {
    // Convert filePath string to vscode.Uri
    const uri = vscode.Uri.file(filePath);
    // Retrieve diagnostics for the given URI
    const diagnostics = diagnosticCollection.get(uri);
    if (!diagnostics) {
        console.warn(`No diagnostics found for file: ${filePath}`);
        return;
    }
    // Find the index of the diagnostic to remove
    const index = diagnostics.findIndex((diag) => diag.message === diagnostic.message && diag.range.isEqual(diagnostic.range));
    if (index !== -1) {
        // Create a new array excluding the diagnostic to remove
        const updatedDiagnostics = diagnostics.filter((_, i) => i !== index);
        // Update the diagnostic collection with the new array
        diagnosticCollection.set(uri, updatedDiagnostics);
        vscode.window.showInformationMessage(`Diagnostic for "${diagnostic.message}" removed.`);
    }
    else {
        console.warn("No matching diagnostic found to remove.");
    }
}
// Function to replace the entire content of the file with refactored code
async function applyRefactoredCode(editor, refactoredCode) {
    const edit = new vscode.WorkspaceEdit();
    const document = editor.document;
    const firstLine = document.lineAt(0);
    const lastLine = document.lineAt(document.lineCount - 1);
    const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
    edit.replace(document.uri, fullRange, refactoredCode);
    await vscode.workspace.applyEdit(edit);
}
class DiagnosticRefactorProvider {
    static providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
    provideCodeActions(document, range, context, token) {
        // Filter diagnostics that match the selected range
        const matchingDiagnostics = context.diagnostics.filter((diagnostic) => diagnostic.range.intersection(range) !== undefined);
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
function deactivate() {
    if (ws) {
        ws.close();
        ws = null;
    }
}
function triggerCodeSmellDetection(codeSmell, context) {
    (0, websockets_1.establishWebSocketConnection)(codeSmell, ws, fileData, FileDetectionData, 'detection', codeSmell, diagnosticCollection, context);
    console.log("HELLLOO ME HERE");
    if (!(!ws || ws.readyState !== ws_1.default.OPEN)) {
        console.log("websocket state: ", ws.readyState);
        console.log("__________________FILE DETECTION DATA in trigger __________________");
        console.log(FileDetectionData);
        console.log("_____________________________________________________");
    }
}
//# sourceMappingURL=extension.js.map