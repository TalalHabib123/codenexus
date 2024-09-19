import * as vscode from 'vscode';
import { CodeResponse } from './types/api';
import { FolderStructure } from './types/folder';
import { sendFileToServer } from './utils/api/ast_server';
import { traverseFolder, folderStructure } from './utils/codebase_analysis/folder_analysis';
import { buildDependencyGraph } from './utils/codebase_analysis/graph/dependency';
import { detectCodeSmells } from './codeSmells/detection';

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

    let jsonRes = JSON.stringify(fileData, null, 2);
    let jsonCode = JSON.parse(jsonRes);
    let asts = Object.keys(jsonCode).map(key => {
        let ast = JSON.parse(jsonCode[key].ast);
        let filePath = key;
        let fileContent = allFiles[filePath];
        return { ast, filePath, fileContent };
    });
    console.log(asts);
    detectCodeSmells(asts);

    const dependencyGraph = buildDependencyGraph(fileData, folderStructureData, folders);


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
