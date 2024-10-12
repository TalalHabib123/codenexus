import * as vscode from "vscode";
import * as path from "path";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { VariableConflictAnalysis } from "../../types/api";
import { extractUsedAtLines } from "../line_getters";

export function showProblemsTab() {
  vscode.commands.executeCommand("workbench.action.problems.focus");
}
export let detectedCodeSmells: Set<string> = new Set();

export function showCodeSmellsInProblemsTab(
  FileDetectionData: { [key: string]: DetectionResponse },
  diagnosticCollection: vscode.DiagnosticCollection
) {
  diagnosticCollection.clear();
  //long parameter
  for (const [filePath, detectionData] of Object.entries(FileDetectionData)) {
    const diagnostics: vscode.Diagnostic[] = [];
    if (
      detectionData.long_parameter_list?.success &&
      detectionData.long_parameter_list.data &&
      "long_parameter_list" in detectionData.long_parameter_list.data
    ) {
      detectedCodeSmells.add("Long Parameter List");
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
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                message,
                vscode.DiagnosticSeverity.Warning
              )
            );
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
      detectedCodeSmells.add("Magic Number");
      const magicNumber = detectionData.magic_numbers.data.magic_numbers;
      if (magicNumber) {
        magicNumber.forEach((magicNumberobj) => {
          const range = new vscode.Range(
            new vscode.Position(magicNumberobj.line_number - 1, 0),
            new vscode.Position(magicNumberobj.line_number - 1, 100)
          );
          const message = `Magic number detected: ${magicNumberobj.magic_number}`;
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            )
          );
        });
      }
    }
    //Naming convention
    if (
      detectionData.naming_convention?.success &&
      detectionData.naming_convention.data &&
      "inconsistent_naming" in detectionData.naming_convention.data
    ) {
      detectedCodeSmells.add("Inconsistent naming convention");
      const namingConven =
        detectionData.naming_convention.data.inconsistent_naming;
      if (namingConven) {
        namingConven.forEach((namingConvenobj) => {
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 100)
          );
          const message = `Inconsistent Naming Convention ${namingConvenobj.type} detected with ${namingConvenobj.total_count} instances.`;
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            )
          );
        });
      }
    }

    //Duplicated code
    if (
      detectionData.duplicated_code?.success &&
      detectionData.duplicated_code.data &&
      "duplicate_code" in detectionData.duplicated_code.data
    ) {
      const duplicatedCode = detectionData.duplicated_code.data.duplicate_code;
      detectedCodeSmells.add("Duplicated code");
      if (duplicatedCode) {
        duplicatedCode.forEach((duplicatedCodeobj) => {
          duplicatedCodeobj.duplicates.forEach((obj) => {
            const range = new vscode.Range(
              new vscode.Position(obj.start_line - 1, 0),
              new vscode.Position(obj.start_line - 1, 100)
            );
            const message = `Duplicated code on line ${obj.start_line} till line ${obj.end_line}`;
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                message,
                vscode.DiagnosticSeverity.Warning
              )
            );
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
      detectedCodeSmells.add("Global conflict");
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
      detectedCodeSmells.add("Unused Variable");
      const unusedVar = detectionData.unused_variables.data.unused_variables;
      if (unusedVar) {
        unusedVar.forEach((unusedVarobj) => {
          const range = new vscode.Range(
            new vscode.Position(unusedVarobj.line_number - 1, 0),
            new vscode.Position(unusedVarobj.line_number - 1, 100)
          );
          const message = `Unused variable detected: ${unusedVarobj.variable_name}`;
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            )
          );
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
      detectedCodeSmells.add("Unreachable code");
      if (Array.isArray(unreachable)) {
        unreachable.forEach((unreachableCode, index) => {
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 100)
          );

          const message = `Unreachable code detected: ${unreachableCode}`;
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            )
          );
        });
      }
    }

    if (
      detectionData.dead_code?.success &&
      "class_details" in detectionData.dead_code &&
      "function_names" in detectionData.dead_code &&
      "global_variables" in detectionData.dead_code
    ) {
      const classDetails = detectionData.dead_code.class_details;
      const funcNames = detectionData.dead_code.function_names;
      const globalVariables = detectionData.dead_code.global_variables;

      if (Array.isArray(classDetails) && classDetails.length > 0) {
        classDetails.forEach((classDetail) => {
          const range = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
          );

          diagnostics.push(
            new vscode.Diagnostic(
              range,
              `${classDetail.class_name} contains dead code`,
              vscode.DiagnosticSeverity.Warning
            )
          );
        });
        if (Array.isArray(funcNames) && funcNames.length > 0) {
          funcNames.forEach((funcName) => {
            const range = new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            );
            console.log(funcName);
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `${funcName} was defined but never used`,
                vscode.DiagnosticSeverity.Warning
              )
            );
          });
        }
        if (Array.isArray(globalVariables) && globalVariables.length > 0) {
          globalVariables.forEach((globalVariable) => {
            const range = new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            );
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                `${globalVariable} was defined but never used`,
                vscode.DiagnosticSeverity.Warning
              )
            );
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
      detectedCodeSmells.add("temporary field");
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
            diagnostics.push(
              new vscode.Diagnostic(
                range,
                message,
                vscode.DiagnosticSeverity.Warning
              )
            );
          }
        });
      }
    }

    if (
      detectionData.overly_complex_condition?.success &&
      detectionData.overly_complex_condition &&
      "conditionals" in detectionData.overly_complex_condition
    ) {
      const tempField = detectionData.overly_complex_condition.conditionals;
      detectedCodeSmells.add("Overly complex conditions");
      if (Array.isArray(tempField) && tempField.length > 0) {
          let message = `Overly complex conditions detected. `;
          diagnostics.push({
            message,
            range: new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            ),
            severity: vscode.DiagnosticSeverity.Warning,
          });
        };
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
