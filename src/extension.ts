import * as vscode from 'vscode';
import { CodeResponse } from './types/api';
import { FolderStructure } from './types/folder';
import { sendFileToServer } from './utils/api/ast_server';
import { traverseFolder, folderStructure } from './utils/codebase_analysis/folder_analysis';
import { buildDependencyGraph } from './utils/codebase_analysis/graph/dependency';


const fileData: { [key: string]: CodeResponse } = {};

const folderStructureData: { [key: string]: FolderStructure } = {};



export async function activate(context: vscode.ExtensionContext) {
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
    const fileSendPromises = Object.entries(allFiles).map(([filePath, content]) => 
        sendFileToServer(filePath, content, fileData)
    );
    await Promise.all(fileSendPromises);

    // const panel = vscode.window.createWebviewPanel(
    //     'fileList',
    //     'Workspace Files',
    //     vscode.ViewColumn.One,
    //     {}
    // );
    // panel.webview.html = getWebviewContent(fileData);
    // const dependencyGraph = buildDependencyGraph(fileData);
    // const sortedFiles = topologicalSort(dependencyGraph);

    console.log("File Data: ", fileData);

    // console.log("Folder Structure Data: ", folderStructureData);

    const dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);

    console.log("Dependency Graph: ", dependencyGraph);

}

function getWebviewContent(fileData: { [key: string]: CodeResponse }): string {
    let content = '<html><body>';
    for (const [filePath, data] of Object.entries(fileData)) {
        content += `<h2>${filePath}</h2>`;
        if (data.success) {
            content += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        } else {
            content += `<pre style="color:red;">Error: ${data.error}</pre>`;
        }
    }
    content += '</body></html>';
    return content;
}


export function deactivate() { }
