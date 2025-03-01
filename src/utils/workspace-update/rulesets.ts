// // import * as vscode from 'vscode';
// // import * as fs from 'fs';
// // import * as path from 'path';
// // import { fileWatcherEventHandler } from './update';

// // export function createFile(context: vscode.ExtensionContext) {
// //     // Register a command to generate the JSON file
// //     let disposable = vscode.commands.registerCommand('extension.generateJson', async () => {
// //         const workspaceFolders = vscode.workspace.workspaceFolders;

// //         if (!workspaceFolders) {
// //             vscode.window.showErrorMessage('No workspace folder is open.');
// //             return;
// //         }

// //         const rootPath = workspaceFolders[0].uri.fsPath; // Get the root workspace folder path
// //         const jsonFilePath = path.join(rootPath, 'codenexus-rulesets.json'); // Define the JSON file path

// //         // Check if the file already exists
// //         if (fs.existsSync(jsonFilePath)) {
// //             vscode.window.showInformationMessage('JSON file already exists. No action taken.');
// //             return;
// //         }

// //         const jsonContent = {
// //             RefactorSmells: "*", 
// //             DetectSmells: "*",  
// //             IncludeFiles: [     
// //                  "*"
// //             ],
// //             ExcludeFiles: [      
// //                 "*"
// //             ]
// //         };
       

// //         // Write the JSON file
// //         fs.writeFile(jsonFilePath, JSON.stringify(jsonContent, null, 2), (err) => {
// //             if (err) {
// //                 vscode.window.showErrorMessage(`Failed to create JSON file: ${err.message}`);
// //             } else {
// //                 vscode.window.showInformationMessage(`JSON file created at ${jsonFilePath}`);
// //             }
// //         });
// //     });

// //     context.subscriptions.push(disposable);
// //     // Automatically generate the JSON file when the extension is activated
// //     vscode.commands.executeCommand('extension.generateJson');
// // }

// // function rulesetsFileWatcher (context: vscode.ExtensionContext) {
// //     const fileWatcher = vscode.workspace.createFileSystemWatcher('codenexus-rulesets.json', false, false, false);

// //     fileWatcher.onDidCreate(uri => {
// //         // Add the file to the dependency graph and check its compilability
// //         checkRulesetsSyntax(uri.fsPath);
// //     });

// //     fileWatcher.onDidChange(uri => {
// //         checkRulesetsSyntax(uri.fsPath);
// //     });

// //     fileWatcher.onDidDelete(uri => {
// //         // Remove the file from the dependency graph
// //         console.log(`File deleted: ${uri.fsPath}`);
// //     });
// // };



// // function checkRulesetsSyntax(jsonContent: any): boolean {
// //     // Check if required fields exist
// //     if (!jsonContent.RefactorSmells || !jsonContent.DetectSmells || !jsonContent.IncludeFiles || !jsonContent.ExcludeFiles) {
// //         return false;
// //     }

// //     // Define the list of acceptable code smells (case-insensitive)
// //     const acceptableCodeSmells = [
// //         "long functions",
// //         "long parameter list",
// //         "too many nested loops",
// //         "overly complex conditional statements",
// //         "god object",
// //         "switch statement abuser",
// //         "temporary field",
// //         "over-encapsulation",
// //         "dead code",
// //         "duplicated code",
// //         "unreachable code",
// //         "duplicated logic",
// //         "comments as code",
// //         "feature envy",
// //         "middle man",
// //         "inappropriate intimacy",
// //         "unutilized variables",
// //         "magic numbers",
// //         "variables naming notation",
// //         "global variables conflict",
// //         "excessive use of flags"
// //     ];

// //     // Check if the provided code smells are valid
// //     if (jsonContent.RefactorSmells && Array.isArray(jsonContent.RefactorSmells)) {
// //         for (const smell of jsonContent.RefactorSmells) {
// //             if (!acceptableCodeSmells.includes(smell.toLowerCase())) {
// //                 return false; // Invalid code smell found
// //             }
// //         }
// //     }

// //     if (jsonContent.DetectSmells && Array.isArray(jsonContent.DetectSmells)) {
// //         for (const smell of jsonContent.DetectSmells) {
// //             if (!acceptableCodeSmells.includes(smell.toLowerCase())) {
// //                 return false; 
// //             }
// //         }
// //     }

// //     return true; 
// // }



// import * as vscode from 'vscode';
// import * as fs from 'fs';
// import * as path from 'path';

// export function createFile(context: vscode.ExtensionContext) {
//     let disposable = vscode.commands.registerCommand('extension.generateJson', async () => {
//         console.log('Generating JSON file...'); 
//         const workspaceFolders = vscode.workspace.workspaceFolders;
//         if (!workspaceFolders) {
//             vscode.window.showErrorMessage('No workspace folder is open.');
//             return;
//         }

//         const rootPath = workspaceFolders[0].uri.fsPath;
//         const jsonFilePath = path.join(rootPath, 'codenexus-rulesets.json');

//         if (fs.existsSync(jsonFilePath)) {
//             vscode.window.showInformationMessage('JSON file already exists. No action taken.');
//             return;
//         }

//         const jsonContent = {
//             RefactorSmells: ["*"], 
//             DetectSmells: ["*"],  
//             IncludeFiles: ["*"],
//             ExcludeFiles: ["*"]
//         };

//         fs.writeFile(jsonFilePath, JSON.stringify(jsonContent, null, 2), (err) => {
//             if (err) {
//                 vscode.window.showErrorMessage(`Failed to create JSON file: ${err.message}`);
//             } else {
//                 vscode.window.showInformationMessage(`JSON file created at ${jsonFilePath}`);
//             }
//         });
//     });

//     context.subscriptions.push(disposable);
//     vscode.commands.executeCommand('extension.generateJson');
// }

// export function rulesetsFileWatcher(context: vscode.ExtensionContext) {
//     const diagnosticCollection = vscode.languages.createDiagnosticCollection('rulesetsDiagnostics');
//     context.subscriptions.push(diagnosticCollection);
    
//     const fileWatcher = vscode.workspace.createFileSystemWatcher('**/codenexus-rulesets.json');
    
//     fileWatcher.onDidChange(uri => validateRulesets(uri, diagnosticCollection));
//     fileWatcher.onDidCreate(uri => validateRulesets(uri, diagnosticCollection));
//     fileWatcher.onDidDelete(uri => diagnosticCollection.clear());
    
//     context.subscriptions.push(fileWatcher);
// }

// function validateRulesets(uri: vscode.Uri, diagnosticCollection: vscode.DiagnosticCollection) {
//     console.log('Validating codenexus-rulesets.json...');
//     const diagnostics: vscode.Diagnostic[] = [];
//     fs.readFile(uri.fsPath, 'utf8', (err, data) => {
//         if (err) {
//             return;
//         }

//         try {
//             const jsonContent = JSON.parse(data);
            
//             if (!jsonContent.RefactorSmells || !jsonContent.DetectSmells || !jsonContent.IncludeFiles || !jsonContent.ExcludeFiles) {
//                 diagnostics.push(new vscode.Diagnostic(
//                     new vscode.Range(0, 0, 0, 10),
//                     'Missing required fields in codenexus-rulesets.json.',
//                     vscode.DiagnosticSeverity.Error
//                 ));
//             }

//             const acceptableCodeSmells = [
//                 "long functions", "long parameter list", "too many nested loops",
//                 "overly complex conditional statements", "god object", "switch statement abuser",
//                 "temporary field", "over-encapsulation", "dead code", "duplicated code",
//                 "unreachable code", "duplicated logic", "comments as code", "feature envy",
//                 "middle man", "inappropriate intimacy", "unutilized variables", "magic numbers",
//                 "variables naming notation", "global variables conflict", "excessive use of flags"
//             ];

//             ["RefactorSmells", "DetectSmells"].forEach(key => {
//                 if (Array.isArray(jsonContent[key])) {
//                     jsonContent[key].forEach((smell: string, index: number) => {
//                         if (!acceptableCodeSmells.includes(smell.toLowerCase())) {
//                             diagnostics.push(new vscode.Diagnostic(
//                                 new vscode.Range(index, 0, index, 10),
//                                 `Invalid code smell: ${smell}`,
//                                 vscode.DiagnosticSeverity.Error
//                             ));
//                         }
//                     });
//                 }
//             });
//         } catch (parseError) {
//             diagnostics.push(new vscode.Diagnostic(
//                 new vscode.Range(0, 0, 0, 10),
//                 'Invalid JSON syntax in codenexus-rulesets.json.',
//                 vscode.DiagnosticSeverity.Error
//             ));
//         }
        
//         diagnosticCollection.set(uri, diagnostics);
//     });
// }



import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


export function createFile(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.generateJson', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const jsonFilePath = path.join(rootPath, 'codenexus-rulesets.json');

        if (fs.existsSync(jsonFilePath)) {
            vscode.window.showInformationMessage('JSON file already exists. No action taken.');
            return;
        }

        const jsonContent = {
            RefactorSmells: ["*"], 
            DetectSmells: ["*"],  
            IncludeFiles: ["*"],
            ExcludeFiles: ["*"]
        };

        fs.writeFile(jsonFilePath, JSON.stringify(jsonContent, null, 2), (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Failed to create JSON file: ${err.message}`);
            } else {
                vscode.window.showInformationMessage(`JSON file created at ${jsonFilePath}`);
            }
        });
    });

    context.subscriptions.push(disposable);
    vscode.commands.executeCommand('extension.generateJson');
}

export function watchRulesetsFile(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('rulesetsDiagnostics');
    context.subscriptions.push(diagnosticCollection);
    
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/codenexus-rulesets.json');
    
    fileWatcher.onDidChange(uri => validateRulesets(uri, diagnosticCollection));
    fileWatcher.onDidCreate(uri => validateRulesets(uri, diagnosticCollection));
    fileWatcher.onDidDelete(() => diagnosticCollection.clear());
    
    context.subscriptions.push(fileWatcher);
}

function validateRulesets(uri: vscode.Uri, diagnosticCollection: vscode.DiagnosticCollection) {
    console.log('Validating codenexus-rulesets.json...');
    const diagnostics: vscode.Diagnostic[] = [];
    
    fs.readFile(uri.fsPath, 'utf8', (err, data) => {
        if (err) return;

        try {
            const jsonContent = JSON.parse(data);
            validateRequiredFields(jsonContent, diagnostics);
            validateCodeSmells(jsonContent, diagnostics, data);
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

function validateRequiredFields(jsonContent: any, diagnostics: vscode.Diagnostic[]) {
    const requiredFields = ["RefactorSmells", "DetectSmells", "IncludeFiles", "ExcludeFiles"];
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

function validateCodeSmells(jsonContent: any, diagnostics: vscode.Diagnostic[], data: string) {
    const acceptableCodeSmells = [
        "*", "long functions", "long parameter list", "too many nested loops",
        "overly complex conditional statements", "god object", "switch statement abuser",
        "temporary field", "over-encapsulation", "dead code", "duplicated code",
        "unreachable code", "duplicated logic", "comments as code", "feature envy",
        "middle man", "inappropriate intimacy", "unutilized variables", "magic numbers",
        "variables naming notation", "global variables conflict", "excessive use of flags"
    ];

    ["RefactorSmells", "DetectSmells"].forEach(key => {
        if (Array.isArray(jsonContent[key])) {
            jsonContent[key].forEach(smell => {
                if (!acceptableCodeSmells.includes(smell.toLowerCase())) {
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

function findValuePosition(data: string, value: string): { line: number, col: number } {
    const lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const col = lines[i].indexOf(`"${value}"`);
        if (col !== -1) {
            return { line: i, col };
        }
    }
    return { line: 0, col: 0 };
}
