import * as vscode from 'vscode';
import * as path from 'path';
export function showProblemsTab() {
    vscode.commands.executeCommand('workbench.action.problems.focus');
}

// Create a diagnostic collection
const diagnosticCollection = vscode.languages.createDiagnosticCollection('codeSmells');

// Function to add a diagnostic entry
export function addDiagnostic(problem: string, filePath: string) {
    console.log("Problem:", problem);
    console.log("File Path:", filePath);

    vscode.workspace.openTextDocument(filePath).then(document => {
        console.log("Document:", document);

        const diagnostics: vscode.Diagnostic[] = [];
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1)); // Empty range
        console.log("Range:", range);

        const diagnostic = new vscode.Diagnostic(range, problem, vscode.DiagnosticSeverity.Warning);
        console.log("Diagnostic:", diagnostic);

        // Use a tag to mark it as unnecessary, fading it out in the editor (optional)
        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        console.log("Diagnostic with tags:", diagnostic);

        // Add the diagnostic entry to the collection
        diagnostics.push(diagnostic);
        console.log("Diagnostics array:", diagnostics);

        diagnosticCollection.set(document.uri, diagnostics);
        console.log("Diagnostic Collection set for URI:", document.uri);
    });
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