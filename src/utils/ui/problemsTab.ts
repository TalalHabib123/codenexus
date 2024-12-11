import * as vscode from "vscode";
import * as path from "path";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { VariableConflictAnalysis } from "../../types/api";
import { extractUsedAtLines } from "../line_getters";

export function showProblemsTab() {
  vscode.commands.executeCommand("workbench.action.problems.focus");
}


type CodeSmellDetail = {
    type: string;      
    filePath: string;    
    startlineNumber: number;  
    endlineNumber: number;      
};

// Initialize the Set
export let detectedCodeSmells: Set<CodeSmellDetail> = new Set<CodeSmellDetail>();


export function showCodeSmellsInProblemsTab(
  FileDetectionData: { [key: string]: DetectionResponse },
  diagnosticCollection: vscode.DiagnosticCollection
) {
  diagnosticCollection.clear();

  

  for (const [filePath, detectionData] of Object.entries(FileDetectionData)) {
    const diagnostics: vscode.Diagnostic[] = [];
  //   if (
  //     detectionData.Unuse?.success &&
  //     detectionData.long_parameter_list.data &&
  //     "long_parameter_list" in detectionData.long_parameter_list.data
  //   ) {
  //     detectedCodeSmells.add("Long Parameter List");
  //     const longparameter =
  //       detectionData.long_parameter_list.data.long_parameter_list;
  //     if (longparameter) {
  //       longparameter.forEach((longparameterobj) => {
  //         if (longparameterobj.long_parameter === true) {
  //           const range = new vscode.Range(
  //             new vscode.Position(longparameterobj.line_number - 1, 0),
  //             new vscode.Position(longparameterobj.line_number - 1, 100)
  //           );
  //           const message = `Long parameter list detected: ${longparameterobj.function_name} with ${longparameterobj.long_parameter_count} parameters`;
  //           const newDiagnostic = new vscode.Diagnostic(
  //             range,
  //             message,
  //             vscode.DiagnosticSeverity.Warning
  //           );

  //           // Check for duplicate diagnostics
  //           const existingDiagnostic = diagnostics.find(
  //             (diag) =>
  //               diag.range.isEqual(newDiagnostic.range) &&
  //               diag.message === newDiagnostic.message
  //           );

  //           if (!existingDiagnostic) {
  //             diagnostics.push(newDiagnostic);
  //           }
  //         }
  //       });
  //     }
  //   }
    if (
      detectionData.long_parameter_list?.success &&
      detectionData.long_parameter_list.data &&
      "long_parameter_list" in detectionData.long_parameter_list.data
    ) {
     
      const longparameter =
        detectionData.long_parameter_list.data.long_parameter_list;
      if (longparameter) {
        longparameter.forEach((longparameterobj) => {
          if (longparameterobj.long_parameter === true) {
            const range = new vscode.Range(
              new vscode.Position(longparameterobj.line_number - 1, 0),
              new vscode.Position(longparameterobj.line_number - 1, 100)
            );
            const message = `Long parameter list detected: ${longparameterobj.function_name} with ${longparameterobj.long_parameter_count} parameters`;
            const newDiagnostic = new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning,
            
            );
            detectedCodeSmells.add({ type: "Long Parameter List", filePath, startlineNumber: longparameterobj.line_number , endlineNumber: longparameterobj.line_number });
            // Check for duplicate diagnostics
            const existingDiagnostic = diagnostics.find(
              (diag) =>
                diag.range.isEqual(newDiagnostic.range) &&
                diag.message === newDiagnostic.message
            );

            if (!existingDiagnostic) {
              diagnostics.push(newDiagnostic);
            }
          }
        });
      }
    }
    //magic number
    if (
      detectionData.magic_numbers?.success &&
      detectionData.magic_numbers.data &&
      "magic_numbers" in detectionData.magic_numbers.data
    ) {
      
      const magicNumber = detectionData.magic_numbers.data.magic_numbers;
      if (magicNumber) {
        magicNumber.forEach((magicNumberobj) => {
          const range = new vscode.Range(
            new vscode.Position(magicNumberobj.line_number - 1, 0),
            new vscode.Position(magicNumberobj.line_number - 1, 100)
          );
          const message = `Magic number detected: ${magicNumberobj.magic_number}`;
          const newDiagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
          );
          detectedCodeSmells.add({ type: "Magic Number", filePath, startlineNumber: magicNumberobj.line_number,endlineNumber: magicNumberobj.line_number });
          // Check for duplicate diagnostics
          const existingDiagnostic = diagnostics.find(
            (diag) =>
              diag.range.isEqual(newDiagnostic.range) &&
              diag.message === newDiagnostic.message
          );

          if (!existingDiagnostic) {
            diagnostics.push(newDiagnostic);
          }
        });
      }
    }
    //Naming convention
    if (
      detectionData.naming_convention?.success &&
      detectionData.naming_convention.data &&
      "inconsistent_naming" in detectionData.naming_convention.data
    ) {
      

const namingConven = detectionData.naming_convention.data.inconsistent_naming;

if (namingConven) {
  // Filter out naming types with 0 instances
  const activeNamingTypes = namingConven.filter(
    (namingConvenobj) => namingConvenobj.type_count > 0
  );

  if (activeNamingTypes.length > 1) {
    // Case 2: Two or more types have more than 0 instances
    const range = new vscode.Range(
      new vscode.Position(0, 0), // Adjust the range as needed
      new vscode.Position(0, 100)
    );
  
    const message = `Inconsistent naming convention detected in the code.`;
    const diagnostic=  new vscode.Diagnostic(
      range,
      message,
      vscode.DiagnosticSeverity.Warning,
      
    );
    diagnostic.code= "Inconsistent Naming convention";
    diagnostics.push(diagnostic);
  } else if (activeNamingTypes.length === 1) {
    // Case 1: Only one naming type with > 0 instances, do not push anything
    // No action needed
  }
}
detectedCodeSmells.add({ type: "Inconsistent Naming convention", filePath, startlineNumber: 0 , endlineNumber: 0 }); 
    }

    //Duplicated code
    if (
      detectionData.duplicated_code?.success &&
      detectionData.duplicated_code.data &&
      "duplicate_code" in detectionData.duplicated_code.data
    ) {
      const duplicatedCode = detectionData.duplicated_code.data.duplicate_code;
     
      if (duplicatedCode) {
        duplicatedCode.forEach((duplicatedCodeobj) => {
          duplicatedCodeobj.duplicates.forEach((obj) => {
            const range = new vscode.Range(
              new vscode.Position(obj.start_line - 1, 0),
              new vscode.Position(obj.start_line - 1, 100)
            );
            const message = `Duplicated code on line ${obj.start_line} till line ${obj.end_line}`;
            const newDiagnostic = new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            );
            detectedCodeSmells.add({ type: "Duplicated code", filePath, startlineNumber:obj.start_line , endlineNumber: obj.end_line });
            // Check for duplicate diagnostics
            const existingDiagnostic = diagnostics.find(
              (diag) =>
                diag.range.isEqual(newDiagnostic.range) &&
                diag.message === newDiagnostic.message
            );

            if (!existingDiagnostic) {
              diagnostics.push(newDiagnostic);
            }
          });
        });
      }
    }
    //Global conflict
    if (
      detectionData.global_conflict?.success &&
      detectionData.global_conflict &&
      "conflicts_report" in detectionData.global_conflict
    ) {
     
      const globalVariable = detectionData.global_conflict.conflicts_report;
      if (Array.isArray(globalVariable)) {
        globalVariable.forEach(
          (globalVariableobj: VariableConflictAnalysis) => {
            const range = new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            );
            // Create a message for the diagnostic
            globalVariableobj.conflicts.forEach((conflict) =>
              diagnostics.push(
                new vscode.Diagnostic(
                  range,
                  conflict,
                  vscode.DiagnosticSeverity.Warning
                )
              )
            );
            detectedCodeSmells.add({ type: "Global Variale Conflict", filePath, startlineNumber:0, endlineNumber: 0 });
          }
        );
      }
    }
    //unused variable
    if (
      detectionData.unused_variables?.success &&
      detectionData.unused_variables.data &&
      "unused_variables" in detectionData.unused_variables.data
    ) {
      
      const unusedVar = detectionData.unused_variables.data.unused_variables;
      if (unusedVar) {
        unusedVar.forEach((unusedVarobj) => {
          const range = new vscode.Range(
            new vscode.Position(unusedVarobj.line_number - 1, 0),
            new vscode.Position(unusedVarobj.line_number - 1, 100)
          );
          const message = `Unused variable detected: ${unusedVarobj.variable_name}`;
          const newDiagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
          );
          detectedCodeSmells.add({ type: "Unused Variable", filePath, startlineNumber:unusedVarobj.line_number, endlineNumber: unusedVarobj.line_number });
          // Check for duplicate diagnostics
          const existingDiagnostic = diagnostics.find(
            (diag) =>
              diag.range.isEqual(newDiagnostic.range) &&
              diag.message === newDiagnostic.message
          );

          if (!existingDiagnostic) {
            diagnostics.push(newDiagnostic);
          }
        });
      }
    }
    //unreachable code
    if (
      detectionData.unreachable_code?.success &&
      detectionData.unreachable_code &&
      "unreachable_code" in detectionData.unreachable_code
    ) {
      const unreachable = detectionData.unreachable_code.unreachable_code;
     
      if (Array.isArray(unreachable)) {
        unreachable.forEach((unreachableCode, index) => {
          const range = new vscode.Range(
            new vscode.Position(unreachableCode.line_number-1, 0),
            new vscode.Position(unreachableCode.line_number-1, 100)
          );

          const message = `Unreachable code detected: ${unreachableCode}`;
          const newDiagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
          );
          detectedCodeSmells.add({ type: "Unreachable Code", filePath, startlineNumber:unreachableCode.line_number, endlineNumber: unreachableCode.line_number });
         
          // Check for duplicate diagnostics
          const existingDiagnostic = diagnostics.find(
            (diag) =>
              diag.range.isEqual(newDiagnostic.range) &&
              diag.message === newDiagnostic.message
          );

          if (!existingDiagnostic) {
            diagnostics.push(newDiagnostic);
          }
        });
      }
    }

    if (
      detectionData.dead_code?.success &&
      "class_details" in detectionData.dead_code &&
      "function_names" in detectionData.dead_code &&
      "global_variables" in detectionData.dead_code &&
      "imports" in detectionData.dead_code 
    ) {
      const classDetails = detectionData.dead_code.class_details;
      const funcNames = detectionData.dead_code.function_names;
      const globalVariables = detectionData.dead_code.global_variables;

      if (Array.isArray(classDetails) && classDetails.length > 0) {
        classDetails.forEach((classDetail,index) => {
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
          );
          const newDiagnostic = new vscode.Diagnostic(
            range,
            `${classDetail.class_name} contains dead code`,
              vscode.DiagnosticSeverity.Warning
          );
         newDiagnostic.code= "Dead Class"+index;
          // Check for duplicate diagnostics
          const existingDiagnostic = diagnostics.find(
            (diag) =>
              diag.range.isEqual(newDiagnostic.range) &&
              diag.message === newDiagnostic.message
          );

          if (!existingDiagnostic) {
            diagnostics.push(newDiagnostic);
          }
        });
        if (Array.isArray(funcNames) && funcNames.length > 0) {
          funcNames.forEach((funcName,index) => {
            const range = new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            );
            const newDiagnostic = new vscode.Diagnostic(
              range,
              `${funcName} was defined but never used`,
              vscode.DiagnosticSeverity.Warning
            );
            newDiagnostic.code= "Dead function"+index;
            // Check for duplicate diagnostics
            const existingDiagnostic = diagnostics.find(
              (diag) =>
                diag.range.isEqual(newDiagnostic.range) &&
                diag.message === newDiagnostic.message
            );

            if (!existingDiagnostic) {
              diagnostics.push(newDiagnostic);
            }
          });
        }
        if (Array.isArray(globalVariables) && globalVariables.length > 0) {
          globalVariables.forEach((globalVariable,index) => {
            const range = new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            );
            const newDiagnostic = new vscode.Diagnostic(
              range,
              `${globalVariable} was defined but never used`,
              vscode.DiagnosticSeverity.Warning
            );
            newDiagnostic.code= "Dead Global Variables"+index;
            // Check for duplicate diagnostics
            const existingDiagnostic = diagnostics.find(
              (diag) =>
                diag.range.isEqual(newDiagnostic.range) &&
                diag.message === newDiagnostic.message
            );

            if (!existingDiagnostic) {
              diagnostics.push(newDiagnostic);
            }
          
          });
        }
        
      
      }
    }

    // Temporary field
    if (
      detectionData.temporary_field?.success &&
      detectionData.temporary_field &&
      "temporary_fields" in detectionData.temporary_field
    ) {
      const tempField = detectionData.temporary_field.temporary_fields;
    
      if (Array.isArray(tempField)) {
        tempField.forEach((tempFieldobj) => {
          let m;

          if (extractUsedAtLines(tempFieldobj) != null) {
            m = extractUsedAtLines(tempFieldobj);
          } else {
          }
          if (m != null) {
            let range = new vscode.Range(
              new vscode.Position(m[0] - 1, 0),
              new vscode.Position(m[0] - 1, 100)
            );

            const message = `Temporary detected: ${tempFieldobj}`;
            const newDiagnostic = new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            );
            detectedCodeSmells.add({ type: "Temporary Field", filePath, startlineNumber:m[0], endlineNumber: m[0] });
         
            // Check for duplicate diagnostics
            const existingDiagnostic = diagnostics.find(
              (diag) =>
                diag.range.isEqual(newDiagnostic.range) &&
                diag.message === newDiagnostic.message
            );

            if (!existingDiagnostic) {
              diagnostics.push(newDiagnostic);
            }
          }
        });
      }
    }

    if (
      detectionData.overly_complex_condition?.success &&
      detectionData.overly_complex_condition &&
      "conditionals" in detectionData.overly_complex_condition
    ) {
            const complexField = detectionData.overly_complex_condition.conditionals;
            
      if (Array.isArray(complexField) && complexField.length > 0) {
          complexField.forEach((condition, index) => {
              const range = new vscode.Range(
                  new vscode.Position(condition.line_number - 1, 0),
                  new vscode.Position(condition.line_number - 1, 100)
              );
      
              const message = `Overly complex condition detected: ${condition.condition}`;
              const newDiagnostic = new vscode.Diagnostic(
                  range,
                  message,
                  vscode.DiagnosticSeverity.Warning
              );
      
              newDiagnostic.code = `Complex Conditional-${index}`;
              detectedCodeSmells.add({ 
                  type: "Overly Complex Conditional", 
                  filePath, 
                  startlineNumber: condition.line_number,
                  endlineNumber: condition.line_number 
              });
      
              // Check for duplicate diagnostics
              const existingDiagnostic = diagnostics.find(
                  (diag) =>
                      diag.range.isEqual(newDiagnostic.range) &&
                      diag.message === newDiagnostic.message
              );
      
              if (!existingDiagnostic) {
                  diagnostics.push(newDiagnostic);
              }
          });
      }
      }

    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, diagnostics);
    }
    vscode.commands.executeCommand('package-explorer.refreshCodeSmells');
  }
  
// Create a FolderStructureProvider function
export function createFolderStructureProvider(
  workspaceRoot: string | undefined
): vscode.TreeDataProvider<vscode.TreeItem> {
  // getChildren function to retrieve the children of the current element
  const getChildren = async (
    element?: vscode.TreeItem
  ): Promise<vscode.TreeItem[]> => {
    if (!workspaceRoot) {
      vscode.window.showInformationMessage("No folder in empty workspace");
      return [];
    }

    if (element) {
      return getFilesInFolder(element.resourceUri!.fsPath);
    } else {
      return getFilesInFolder(workspaceRoot);
    }
  };

  // getTreeItem function that returns the TreeItem element
  const getTreeItem = (element: vscode.TreeItem): vscode.TreeItem => {
    return element;
  };

  // Helper function to get files and folders in a directory
  const getFilesInFolder = async (
    folderPath: string
  ): Promise<vscode.TreeItem[]> => {
    const folderItems: vscode.TreeItem[] = [];
    const folderFiles = await vscode.workspace.fs.readDirectory(
      vscode.Uri.file(folderPath)
    );

    folderFiles.forEach(([fileName, fileType]) => {
      const resourceUri = vscode.Uri.file(path.join(folderPath, fileName));
      folderItems.push({
        label: fileName,
        resourceUri: resourceUri,
        collapsibleState:
          fileType === vscode.FileType.Directory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        tooltip: `${fileName}`,
      });
    });

    return folderItems;
  };

  // Return the provider object
  return {
    getChildren,
    getTreeItem,
  };
}


export class CodeSmellsProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            // Root level - group by code smell type
            const types = new Set([...detectedCodeSmells].map(smell => smell.type));
            return Promise.resolve(
                Array.from(types).map(type => 
                    new CodeSmellItem(
                        type, 
                        [...detectedCodeSmells].filter(smell => smell.type === type)
                    )
                )
            );
        } else if (element instanceof CodeSmellItem) {
            // Show files for this smell type
            return Promise.resolve(
                element.instances.map(detail => new FileItem(detail))
            );
        }
        return Promise.resolve([]);
    }
}

abstract class TreeItem extends vscode.TreeItem {}

class CodeSmellItem extends TreeItem {
    constructor(
        public readonly type: string,
        public readonly instances: CodeSmellDetail[]
    ) {
        super(type, vscode.TreeItemCollapsibleState.Expanded);
        this.tooltip = `${instances.length} instance(s) found`;
    }
}

class FileItem extends TreeItem {
    constructor(private detail: CodeSmellDetail) {
        super(path.basename(detail.filePath), vscode.TreeItemCollapsibleState.None);
        this.tooltip = detail.filePath;
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(detail.filePath)]
        };
    }
}




// // Update FileItem class to include context menu
// class FileItem extends TreeItem {
//   constructor(private detail: CodeSmellDetail) {
//       super(path.basename(detail.filePath), vscode.TreeItemCollapsibleState.None);
//       this.tooltip = `${detail.filePath}\nClick to open file\nRight click to see refactor options`;
//       this.contextValue = 'codeSmellFile'; // Enable context menu
//       this.command = {
//           command: 'vscode.open',
//           title: 'Open File',
//           arguments: [vscode.Uri.file(detail.filePath)]
//       };
//   }
// }

// // Add to package.json in contributes.commands section:
// /*
// {
//   "command": "codenexus.refactorFile",
//   "title": "Refactor Code Smell"
// }

// // Add to contributes.menus section:
// "view/item/context": [
//   {
//       "command": "codenexus.refactorFile",
//       "when": "view == package-outline && viewItem == codeSmellFile",
//       "group": "inline"
//   }
// ]
// */

// // Add command registration in extension.ts activate function:
// ```typescript
// context.subscriptions.push(
//   vscode.commands.registerCommand('codenexus.refactorFile', (item: FileItem) => {
//       vscode.window.showInformationMessage(`Refactoring ${item.detail.type} in ${item.detail.filePath}`);
//       // Call your existing refactor logic here
//   })
// );





