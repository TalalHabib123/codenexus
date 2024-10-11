import * as vscode from 'vscode';
import * as path from 'path';
import { CodeResponse, DetectionResponse } from '../../types/api';

export function showProblemsTab() {
    vscode.commands.executeCommand('workbench.action.problems.focus');
}


export function showCodeSmellsInProblemsTab(
  FileDetectionData: { [key: string]: DetectionResponse },
  diagnosticCollection: vscode.DiagnosticCollection
) {
  diagnosticCollection.clear();

  for (const [filePath, detectionData] of Object.entries(FileDetectionData)) {
      const diagnostics: vscode.Diagnostic[] = [];

      if (detectionData.long_parameter_list?.success && detectionData.long_parameter_list.data && 'long_parameter_list' in detectionData.long_parameter_list.data) {
          const longparameter =  detectionData.long_parameter_list.data.long_parameter_list;
          if (longparameter) {
              longparameter.forEach(longparameterobj => {
          if(longparameterobj.long_parameter==true){
              const range = new vscode.Range(
                  new vscode.Position(longparameterobj.line_number - 1, 0), 
                  new vscode.Position(longparameterobj.line_number - 1, 100) 
              );
              const message = `Long parameter list detected: ${longparameterobj.function_name} with ${longparameterobj.long_parameter_count} parameters`;
              diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
              console.log("longparameter:", longparameter);
          }
      }
      );
      }
  }
  if (detectionData.magic_numbers?.success && detectionData.magic_numbers.data && 'magic_numbers' in detectionData.magic_numbers.data) {
      const magicNumber =  detectionData.magic_numbers.data.magic_numbers;
      if (magicNumber) {
          magicNumber.forEach(magicNumberobj => {
          const range = new vscode.Range(
              new vscode.Position(magicNumberobj.line_number - 1, 0), 
              new vscode.Position(magicNumberobj.line_number - 1, 100) 
          );
          const message = `Magic number detected: ${magicNumberobj.magic_number}`;
              diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
      }
      );
      }
  }
  //NMAing convention do it
  // if (detectionData.naming_convention?.success && detectionData.naming_convention.data && 'naming_convention' in detectionData.naming_convention.data) {
  //     const namingConven =  detectionData.naming_convention.data.naming_convention;
  //     if (namingConven) {
  //         namingConven.forEach(namingConvenobj => {
  //         const range = new vscode.Range(
  //             new vscode.Position(namingConvenobj.line_number - 1, 0), 
  //             new vscode.Position(namingConvenobj.line_number - 1, 100) 
  //         );
  //         const message = `Magic number detected: ${namingConvenobj.magic_number}`;
  //             diagnostics.push(new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning));
  //     }
  //     );
  //     }
  // }
  console.log("add")
  if (detectionData. duplicated_code?.success && detectionData. duplicated_code.data && 'duplicate_code' in detectionData. duplicated_code.data) {
    const duplicatedCode =  detectionData. duplicated_code.data.duplicate_code;
  console.log("duplicatedcode",duplicatedCode)
    if (duplicatedCode) {
        duplicatedCode.forEach (duplicatedCodeobj => {
          duplicatedCodeobj.duplicates.forEach(obj=>{
            const range = new vscode.Range(
              new vscode.Position(obj.start_line - 1, 0), 
              new vscode.Position(obj.start_line - 1, 100) 
          );
          const range2=new vscode.Range(
            new vscode.Position(obj.end_line - 1, 0), 
            new vscode.Position(obj.end_line - 1, 100) 
        );
          // const message = `Duplicated code detected: ${obj.magic_number}`;
          //     diagnostics.push(new vscode.Diagnostic(range,range2, message, vscode.DiagnosticSeverity.Warning));
          });
       
    }
    );
    }
}



      const uri = vscode.Uri.file(filePath);
      diagnosticCollection.set(uri, diagnostics);
  
}
}


// Create a FolderStructureProvider function
export function createFolderStructureProvider(workspaceRoot: string | undefined): vscode.TreeDataProvider<vscode.TreeItem> {
  
    // getChildren function to retrieve the children of the current element
    const getChildren = async (element?: vscode.TreeItem): Promise<vscode.TreeItem[]> => {
      if (!workspaceRoot) {
        vscode.window.showInformationMessage('No folder in empty workspace');
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
    const getFilesInFolder = async (folderPath: string): Promise<vscode.TreeItem[]> => {
      const folderItems: vscode.TreeItem[] = [];
      const folderFiles = await vscode.workspace.fs.readDirectory(vscode.Uri.file(folderPath));
  
      folderFiles.forEach(([fileName, fileType]) => {
        const resourceUri = vscode.Uri.file(path.join(folderPath, fileName));
        folderItems.push({
          label: fileName,
          resourceUri: resourceUri,
          collapsibleState: fileType === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          tooltip: `${fileName}`,
        });
      });
  
      return folderItems;
    };
  
    // Return the provider object
    return {
      getChildren,
      getTreeItem
    };
  }