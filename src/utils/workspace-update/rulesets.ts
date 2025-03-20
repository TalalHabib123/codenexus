import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Rules, FileSmellConfig } from '../../types/rulesets';
import { detectCodeSmells } from '../../codeSmells/detection';
import { FileNode } from "../../types/graph";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { createProject } from '../api/log_api/createProject';
import { rulesetsLog } from '../api/log_api/rulesets';
export const rulesetChangedEvent = new vscode.EventEmitter<Rules>();
export const onRulesetChanged = rulesetChangedEvent.event;

export function createFile(context: vscode.ExtensionContext) {
    // Get workspace storage key
    const getWorkspaceKey = () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return null;
        return `rulesetInitialized-${workspaceFolders[0].uri.fsPath}`;
    };

    let disposable = vscode.commands.registerCommand('extension.generateJson', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        if (!rootPath) {
            vscode.window.showErrorMessage('No root path found.');
            return;
        }
        const jsonFilePath = path.join(rootPath, 'codenexus-rulesets.json');
        const workspaceKey = getWorkspaceKey();

        // Check if the ruleset file already exists
        if (fs.existsSync(jsonFilePath)) {
            // If the file exists, mark this workspace as initialized
            if (workspaceKey) {
                context.workspaceState.update(workspaceKey, true);
            }
            vscode.window.showInformationMessage('JSON file already exists. No action taken.');
            return;
        }

        // Check if this is the first time opening the project
        if (workspaceKey && context.workspaceState.get(workspaceKey, false)) {
            // This project has been opened before and the file was likely deleted by the user
            console.log('Ruleset file was previously created but is now missing. User likely deleted it.');
            return;
        }

        const jsonContent: Rules = {
            refactorSmells: ["*"],
            detectSmells: ["*"],
            includeFiles: ["*"],
            excludeFiles: []
        };

        fs.writeFile(jsonFilePath, JSON.stringify(jsonContent, null, 2), (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to create JSON file: ${err.message}`);
            } else {
                // Mark this workspace as initialized
                if (workspaceKey) {
                    context.workspaceState.update(workspaceKey, true);
                }
                createProject({ title: path.basename(rootPath), description: 'New project created' });
                vscode.window.showInformationMessage(`JSON file created at ${jsonFilePath}`);
                // Emit the ruleset changed event
                context.workspaceState.update('rulesetsData', jsonContent);
                const workspace = vscode.workspace.workspaceFolders;
                if (!workspace) return;
                rulesetsLog(path.basename(rootPath), jsonContent);
                rulesetChangedEvent.fire(jsonContent);
            }
        });
    });

    context.subscriptions.push(disposable);
    
    // Only call the command if this is potentially a first-time open
    const workspaceKey = getWorkspaceKey();
    if (workspaceKey && !context.workspaceState.get(workspaceKey, false)) {
        vscode.commands.executeCommand('extension.generateJson');
    }
}
export function watchRulesetsFile(context: vscode.ExtensionContext,
    dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules,
) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('rulesetsDiagnostics');
    context.subscriptions.push(diagnosticCollection);
    
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/codenexus-rulesets.json');
    console.log('Watching for changes to codenexus-rulesets.json...');
    fileWatcher.onDidChange(uri => updateRulesetsData(uri, diagnosticCollection, dependencyGraph, fileData, workspaceFolders, newFiles, FileDetectionData, rulesetsData, context));
    fileWatcher.onDidCreate(uri => updateRulesetsData(uri, diagnosticCollection, dependencyGraph, fileData, workspaceFolders, newFiles, FileDetectionData, rulesetsData, context));
    fileWatcher.onDidDelete(() => {
        diagnosticCollection.clear();
        resetRulesetsData(rulesetsData, context);
        // Emit the ruleset changed event with reset data
        rulesetChangedEvent.fire(rulesetsData);
    });

    context.subscriptions.push(fileWatcher);
}

function updateRulesetsData(uri: vscode.Uri,  
    diagnosticCollection: vscode.DiagnosticCollection,
    dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules,
    context: vscode.ExtensionContext
) {
    console.log('Updating RulesetsData and validating codenexus-rulesets.json...');
    const diagnostics: vscode.Diagnostic[] = [];
    
    fs.readFile(uri.fsPath, 'utf8', (err, data) => {
        if (err) {
            console.log('Error reading rulesets file:', err);
            return;}

        try {
            const jsonContent: Rules = JSON.parse(data);
            validateRequiredFields(jsonContent, diagnostics);
            validateCodeSmells(jsonContent, diagnostics, data);
            validateFileConfigs(jsonContent, diagnostics, data);
            
            rulesetsData = jsonContent;
            context.workspaceState.update('rulesetsData', rulesetsData);
            console.log('Updated RulesetsData:', rulesetsData);
            detectCodeSmells(dependencyGraph, fileData, workspaceFolders, newFiles, FileDetectionData, rulesetsData, context);
            const workspace = vscode.workspace.workspaceFolders;
            if (!workspace) return;
            const rootPath = workspace[0].uri.fsPath;
            rulesetsLog(path.basename(rootPath), rulesetsData);
            // Emit the ruleset changed event
            rulesetChangedEvent.fire(rulesetsData);
        } catch (parseError) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 10),
                'Invalid JSON syntax in codenexus-rulesets.json.',
                vscode.DiagnosticSeverity.Error
            ));
        }

        diagnosticCollection.set(uri, diagnostics);
    });
}

function validateRequiredFields(jsonContent: Rules, diagnostics: vscode.Diagnostic[]) {
    const requiredFields = ["refactorSmells", "detectSmells", "includeFiles", "excludeFiles"];
    requiredFields.forEach(field => {
        if (!jsonContent[field]) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 10),
                `Missing required field: ${field}`,
                vscode.DiagnosticSeverity.Error
            ));
        }
    });
}

function validateCodeSmells(jsonContent: Rules, diagnostics: vscode.Diagnostic[], data: string) {
    const acceptableCodeSmells = [
        "*", "long functions", "long parameter list", "too many nested loops",
        "overly complex conditional statements", "god object", "switch statement abuser",
        "temporary field", "over-encapsulation", "dead code", "duplicated code",
        "unreachable code", "duplicated logic", "comments as code", "feature envy",
        "middle man", "inappropriate intimacy", "magic numbers",
        "variables naming notation", "global variables conflict", "excessive use of flags", 
        "unused variables", "naming convention"
    ];

    ["refactorSmells", "detectSmells"].forEach(key => {
        if (Array.isArray(jsonContent[key])) {
            jsonContent[key].forEach(smell => {
                if (typeof smell === 'string' && !acceptableCodeSmells.includes(smell.toLowerCase())) {
                    const { line, col } = findValuePosition(data, smell);
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(line, col, line, col + smell.length),
                        `Invalid code smell: ${smell}`,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            });
        }
    });
}

function validateFileConfigs(jsonContent: Rules, diagnostics: vscode.Diagnostic[], data: string) {
    ["includeFiles", "excludeFiles"].forEach(key => {
        if (Array.isArray(jsonContent[key])) {
            jsonContent[key].forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    // Validate FileSmellConfig objects
                    const config = item as FileSmellConfig;
                    
                    // Check if path property exists
                    if (!config.path) {
                        diagnostics.push(new vscode.Diagnostic(
                            new vscode.Range(0, 0, 0, 10),
                            `Missing 'path' property in ${key} configuration object`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                    
                    // Check if smells property exists and is an array
                    if (!config.smells || !Array.isArray(config.smells)) {
                        diagnostics.push(new vscode.Diagnostic(
                            new vscode.Range(0, 0, 0, 10),
                            `Missing or invalid 'smells' array in ${key} configuration object for path: ${config.path}`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    } else {
                        // Validate each smell in the array
                        validateConfigSmells(config, key, diagnostics, data);
                    }
                }
            });
        }
    });
}

function validateConfigSmells(config: FileSmellConfig, fileListType: string, diagnostics: vscode.Diagnostic[], data: string) {
    const acceptableCodeSmells = [
        "*", "long functions", "long parameter list", "too many nested loops",
        "overly complex conditional statements", "god object", "switch statement abuser",
        "temporary field", "over-encapsulation", "dead code", "duplicated code",
        "unreachable code", "duplicated logic", "comments as code", "feature envy",
        "middle man", "inappropriate intimacy", "magic numbers",
        "variables naming notation", "global variables conflict", "excessive use of flags", 
        "unused variables", "naming convention"
    ];

    config.smells.forEach(smell => {
        if (typeof smell === 'string' && !acceptableCodeSmells.includes(smell.toLowerCase())) {
            const { line, col } = findValuePosition(data, smell);
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(line, col, line, col + smell.length),
                `Invalid code smell '${smell}' in ${fileListType} configuration for path: ${config.path}`,
                vscode.DiagnosticSeverity.Error
            ));
        }
    });
}

function findValuePosition(data: string, value: string): { line: number, col: number } {
    const lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const col = lines[i].indexOf(`"${value}"`);
        if (col !== -1) {
            return { line: i, col: col + 1 }; // +1 to position after the opening quote
        }
    }
    return { line: 0, col: 0 };
}

function resetRulesetsData(RulesetsData: Rules, context: vscode.ExtensionContext) {
    Object.assign(RulesetsData, {
        refactorSmells: ["*"],
        detectSmells: ["*"],
        includeFiles: ["*"],
        excludeFiles: []
    });
    context.workspaceState.update('rulesetsData', RulesetsData);
    console.log("RulesetsData reset due to file deletion.");
    const workspace = vscode.workspace.workspaceFolders;
    if (!workspace) return;
    const rootPath = workspace[0].uri.fsPath;
    rulesetsLog(path.basename(rootPath), RulesetsData);
}