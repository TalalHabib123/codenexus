import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { detection_api } from '../api/ast_server';
import { traverseFolder } from '../codebase_analysis/folder_analysis';
import { CodeResponse, Response, DetectionResponse } from '../../types/api';

export const fileWatcherEventHandler = (context: vscode.ExtensionContext, 
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);

    fileWatcher.onDidCreate(uri => {
        console.log(`File created: ${uri.fsPath}`);
    });


    fileWatcher.onDidDelete(uri => {
        console.log(`File deleted: ${uri.fsPath}`);
    });


    fileWatcher.onDidChange(uri => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
              return;
            }
            const document = editor.document;
        
            if (document.languageId !== 'python') {
              return;
            }
        
            const filePath = document.fileName;
            checkCompilable(filePath, fileData, detectionData);
    });

};


function checkCompilable(filePath: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }
) {
  // Ensure that Python is available and run the Python compile command
  const command = `python -m py_compile ${filePath}`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.log(err);
    } else {
        if (filePath.endsWith('.py') && !filePath.endsWith('.pyc')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            detection_api(filePath, content, fileData, detectionData);
            }
        }
    });
}