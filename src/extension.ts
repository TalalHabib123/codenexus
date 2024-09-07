import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface GlobalVariable {
    variable_name: string;
    variable_type: string;
}

interface Import {
    name: string;
    alias?: string;
    type: string;
    module?: string;
}

interface CodeResponse {
    ast?: string;
    function_names?: string[];
    class_details?: { [key: string]: string | string[] }[];
    global_variables?: GlobalVariable[];
    is_main_block_present?: boolean;
    imports?: { [key: string]: Import[] };
    is_standalone_file?: boolean;
    success: boolean;
    error?: string;
}

const fileData: { [key: string]: CodeResponse } = {};

export async function activate(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    const processedFiles = context.workspaceState.get<{ [key: string]: string }>('processedFiles', {});
    const allFiles: { [key: string]: string } = { ...processedFiles };
    const newFiles: { [key: string]: string } = {};

    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            traverseFolder(folder.uri.fsPath, allFiles, newFiles);
        }
    }

    context.workspaceState.update('processedFiles', allFiles);
    const fileSendPromises = Object.entries(allFiles).map(([filePath, content]) => 
        sendFileToServer(filePath, content)
    );
    await Promise.all(fileSendPromises);

    const panel = vscode.window.createWebviewPanel(
        'fileList',
        'Workspace Files',
        vscode.ViewColumn.One,
        {}
    );
    console.log(fileData);
    panel.webview.html = getWebviewContent(fileData);
}

function traverseFolder(
    folderPath: string,
    allFiles: { [key: string]: string },
    newFiles: { [key: string]: string }
) {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            traverseFolder(filePath, allFiles, newFiles);
        } else {
            if (filePath.endsWith('.py') && !filePath.endsWith('.pyc') && !allFiles[filePath]) {
                const content = fs.readFileSync(filePath, 'utf-8');
                allFiles[filePath] = content;
                newFiles[filePath] = content;
            }
        }
    }
}

async function sendFileToServer(filePath: string, content: string) {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<CodeResponse>('http://127.0.0.1:8000/analyze-ast', { code: content });
        const responseData = response.data;
        if (responseData.success) {
            console.log(`File ${fileName} sent successfully.`);
            fileData[filePath] = responseData;
        } else {
            console.error(`Error in file ${fileName}: ${responseData.error}`);
            fileData[filePath] = {
                success: false,
                error: responseData.error || "Unknown error",
            };
        }
    } catch (e) {
        console.error(`Failed to send file ${filePath}:`, e);
        fileData[filePath] = {
            success: false,
            error: "Failed to communicate with server" + e,
        };
    }
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
