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
export let detectedCodeSmells: Set<CodeSmellDetail> =
  new Set<CodeSmellDetail>();

export function showCodeSmellsInProblemsTab(
  FileDetectionData: { [key: string]: DetectionResponse },
  diagnosticCollection: vscode.DiagnosticCollection
) {
  diagnosticCollection.clear();

  for (const [filePath, detectionData] of Object.entries(FileDetectionData)) {
    const diagnostics: vscode.Diagnostic[] = [];
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
              vscode.DiagnosticSeverity.Warning
            );
            detectedCodeSmells.add({
              type: "Long Parameter List",
              filePath,
              startlineNumber: longparameterobj.line_number,
              endlineNumber: longparameterobj.line_number,
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
          detectedCodeSmells.add({
            type: "Magic Number",
            filePath,
            startlineNumber: magicNumberobj.line_number,
            endlineNumber: magicNumberobj.line_number,
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
    //Naming convention
    if (
      detectionData.naming_convention?.success &&
      detectionData.naming_convention.data &&
      "inconsistent_naming" in detectionData.naming_convention.data
    ) {
      const namingConven =
        detectionData.naming_convention.data.inconsistent_naming;

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
          const diagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.code = "Inconsistent Naming convention";
          diagnostics.push(diagnostic);
        } else if (activeNamingTypes.length === 1) {
          // Case 1: Only one naming type with > 0 instances, do not push anything
          // No action needed
        }
      }
      detectedCodeSmells.add({
        type: "Inconsistent Naming convention",
        filePath,
        startlineNumber: 0,
        endlineNumber: 0,
      });
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
            detectedCodeSmells.add({
              type: "Duplicated code",
              filePath,
              startlineNumber: obj.start_line,
              endlineNumber: obj.end_line,
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
                  "Global Variale Conflict:" + conflict,
                  vscode.DiagnosticSeverity.Warning
                )
              )
            );
            detectedCodeSmells.add({
              type: "Global Variale Conflict",
              filePath,
              startlineNumber: 0,
              endlineNumber: 0,
            });
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
          detectedCodeSmells.add({
            type: "Unused Variable",
            filePath,
            startlineNumber: unusedVarobj.line_number,
            endlineNumber: unusedVarobj.line_number,
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
    //unreachable code
    if (
      detectionData.unreachable_code?.success &&
      detectionData.unreachable_code &&
      "unreachable_code" in detectionData.unreachable_code
    ) {
      const unreachable = detectionData.unreachable_code.unreachable_code;

      if (Array.isArray(unreachable)) {
        unreachable.forEach((unreachableCode, index) => {
        
          const message = `${unreachableCode}`;
       

          // Regular expression to match "line" followed by a number
          const regex = /line\s+(\d+)/i;
          const match = message.match(regex);
          let lineNumber = 0; // Initialize lineNumber
          
          if (match && match[1]) {
              lineNumber = parseInt(match[1], 10); // Corrected assignment without type annotation
          } else {
              console.log("No line number found in the message.");
          }
          
          // Ensure consistent casing: use 'lineNumber' instead of 'linenumber'
          const range = new vscode.Range(
              new vscode.Position(lineNumber - 1, 0),
              new vscode.Position(lineNumber - 1, 100)
          );

          const newDiagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
          );
          detectedCodeSmells.add({ type: "Unreachable Code", filePath, startlineNumber:lineNumber, endlineNumber: lineNumber });
         
          detectedCodeSmells.add({
            type: "Unreachable Code",
            filePath,
            startlineNumber: unreachableCode.line_number,
            endlineNumber: unreachableCode.line_number,
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
        classDetails.forEach((classDetail, index) => {
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
          );
          const newDiagnostic = new vscode.Diagnostic(
            range,
            `${classDetail.class_name} contains dead code`,
            vscode.DiagnosticSeverity.Warning
          );
          newDiagnostic.code = "Dead Class" + index;
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
      if (Array.isArray(funcNames) && funcNames.length > 0) {
        funcNames.forEach((funcName, index) => {
          
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
          );
          const newDiagnostic = new vscode.Diagnostic(
            range,
            `${funcName}: Function was defined but never used`,
            vscode.DiagnosticSeverity.Warning
          );
          newDiagnostic.code = "Dead function" + index;
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
        globalVariables.forEach((globalVariable, index) => {
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
          );
          const newDiagnostic = new vscode.Diagnostic(
            range,
            `${globalVariable}: Global Variable was defined but never used`,
            vscode.DiagnosticSeverity.Warning
          );
          newDiagnostic.code = "Dead Global Variables" + index;
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
            detectedCodeSmells.add({
              type: "Temporary Field",
              filePath,
              startlineNumber: m[0],
              endlineNumber: m[0],
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
      
              const message = `Overly complex condition detected.`;
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
  vscode.commands.executeCommand("package-explorer.refreshCodeSmells");
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
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TreeItem | undefined | void
  >();
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
      const types = new Set([...detectedCodeSmells].map((smell) => smell.type));
      return Promise.resolve(
        Array.from(types).map(
          (type) =>
            new CodeSmellItem(
              type,
              [...detectedCodeSmells].filter((smell) => smell.type === type)
            )
        )
      );
    } else if (element instanceof CodeSmellItem) {
      // Show files for this smell type
      return Promise.resolve(
        element.instances.map((detail) => new FileItem(detail))
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
      command: "vscode.open",
      title: "Open File",
      arguments: [vscode.Uri.file(detail.filePath)],
    };
  }
}

export function userTriggeredcodesmell(
  codeSmell : string,
  FileDetectionData: { [key: string]: DetectionResponse },
  diagnosticCollection: vscode.DiagnosticCollection
) {
  diagnosticCollection.clear();
  for (const [filePath, detectionData] of Object.entries(FileDetectionData)) {
    const diagnostics: vscode.Diagnostic[] = [];
    if (detectionData.user_triggered_detection) {
      detectionData.user_triggered_detection.forEach((detection) => {
        if (detection?.success && detection.data && !detection.outdated) {
          const detectedJobType = detection.job_id;
          let message = "";
          if (detection.job_id === "long_function"  && detection.job_id === codeSmell) {
            detection.data.forEach((data) => {
              message = ` Long function detected ${data.Detected} `;
              detectedCodeSmells.add({
                type: "Long Function",
                filePath,
                startlineNumber: data.line_number,
                endlineNumber: data.line_number,
              });
            });
            // message = ` Long function detected ${detection.data[0].Detection} `;
            // detectedCodeSmells.add({ type: "Long Function", filePath, startlineNumber: detection.data[0].line_number , endlineNumber: detection.data[0].line_number });
          } else if (detection.job_id === "god_object" && detection.job_id === codeSmell) {
            detection.data.forEach((data) => {
              message = ` God object detected ${data.Detected} `;
              detectedCodeSmells.add({
                type: "God object",
                filePath,
                startlineNumber: data.line_number,
                endlineNumber: data.line_number,
              });
            });
            //  message = ` God object detected ${detection.data[0].Detection} `;
            //  detectedCodeSmells.add({ type: "God object", filePath, startlineNumber: detection.data[0].line_number , endlineNumber: detection.data[0].line_number });
          } else if (detection.job_id === "feature_envy"  && detection.job_id === codeSmell) {
            detection.data.forEach((data) => {
              message = ` Feature envy detected ${data.Detected} `;
              detectedCodeSmells.add({
                type: "Feature Envy",
                filePath,
                startlineNumber: data.line_number,
                endlineNumber: data.line_number,
              });
            });
            //  message = ` Feature envy detected ${detection.data[0].Detection} `;
            //  detectedCodeSmells.add({ type: "Feature Envy", filePath, startlineNumber: detection.data[0].line_number , endlineNumber: detection.data[0].line_number });
          } else if (detection.job_id === "inappropriate_intimacy" && detection.job_id === codeSmell) {
            detection.data.forEach((data) => {
              message = ` Inappropriate intimacy detected ${data.Detected} `;
              detectedCodeSmells.add({
                type: "Inappropriate Intimacy",
                filePath,
                startlineNumber: data.line_number,
                endlineNumber: data.line_number,
              });
            });
            // message = ` Inappropriate intimacy detected ${detection.data[0].Detection} `;
            // detectedCodeSmells.add({ type: "Inappropriate Intimacy", filePath, startlineNumber: detection.data[0].line_number , endlineNumber: detection.data[0].line_number });
          } else if (detection.job_id === "middle_man" && detection.job_id === codeSmell) {
            detection.data.forEach((data) => {
              message = ` Middle Man detected ${data.Detected} `;
              detectedCodeSmells.add({
                type: "Middle Man",
                filePath,
                startlineNumber: data.line_number,
                endlineNumber: data.line_number,
              });
            });
          } else if (detection.job_id === "switch_statement_abuser" && detection.job_id === codeSmell) {
            detection.data.forEach((data) => {
              message = ` Switch statement abuser detected ${data.Detected} `;
              detectedCodeSmells.add({
                type: "Switch Statement Abuser",
                filePath,
                startlineNumber: data.line_number,
                endlineNumber: data.line_number,
              });
            });
          } else if (detection.job_id === "excessive_flags" && detection.job_id === codeSmell) {
            detection.data.forEach((data) => {
              message = ` Excessive flags detected ${data.Detected} `;
              detectedCodeSmells.add({
                type: "Excessive Flags",
                filePath,
                startlineNumber: data.line_number,
                endlineNumber: data.line_number,
              });
            });
          }
        if (message !== ""){
          const range = new vscode.Range(
            new vscode.Position(detection.data[0].line_number - 1, 0),
            new vscode.Position(detection.data[0].line_number - 1, 100)
          );
          const newDiagnostic = new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Warning
          );
          const existingDiagnostic = diagnostics.find(
            (diag) =>
              diag.range.isEqual(newDiagnostic.range) &&
              diag.message === newDiagnostic.message
          );

          if (!existingDiagnostic) {
            diagnostics.push(newDiagnostic);
          }
        }
        }
      });
    }
    console.log(diagnostics, diagnostics.length);
    if (diagnostics.length > 0){
    const uri = vscode.Uri.file(filePath);
    diagnosticCollection.set(uri, diagnostics);
    } 
  }
  vscode.commands.executeCommand("package-explorer.refreshCodeSmells");
}
