import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import { FileNode } from '../../types/graph';
import { detectCodeSmells } from '../../codeSmells/detection';
import { CodeResponse, DetectionResponse } from '../../types/api';
import { showCodeSmellsInProblemsTab } from '../ui/problemsTab';
import { Rules } from '../../types/rulesets';
import * as path from 'path';


export const fileWatcherEventHandler = (
  context: vscode.ExtensionContext,
  fileData: { [key: string]: CodeResponse },
  FileDetectionData: { [key: string]: DetectionResponse },
  dependencyGraph: { [key: string]: Map<string, FileNode> },
  folders: string[],
  diagnosticCollection: vscode.DiagnosticCollection,
  rulesetsData: Rules
) => {
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.py', false, false, false);

  fileWatcher.onDidCreate(uri => {
    // Add the file to the dependency graph and check its compilability
    checkCompilable(uri.fsPath, fileData, FileDetectionData, dependencyGraph, folders, diagnosticCollection, rulesetsData);
  });

  fileWatcher.onDidDelete(uri => {
    // Remove the file from the dependency graph
    console.log(`File deleted: ${uri.fsPath}`);
    
    // Remove any diagnostics for the deleted file
    diagnosticCollection.delete(uri);
    
    // Remove file from FileDetectionData
    if (FileDetectionData[uri.fsPath]) {
      delete FileDetectionData[uri.fsPath];
    }
    
    // Remove file from fileData
    if (fileData[uri.fsPath]) {
      delete fileData[uri.fsPath];
    }
    
    // TODO: Update dependency graph to remove references to this file
  });

  const debounceTimers: { [key: string]: NodeJS.Timeout } = {};

  fileWatcher.onDidChange(uri => {
    const filePath = uri.fsPath;

    if (debounceTimers[filePath]) {
      clearTimeout(debounceTimers[filePath]);
    }

    debounceTimers[filePath] = setTimeout(() => {
      if (filePath.endsWith('.py')) {
        checkCompilable(filePath, fileData, FileDetectionData, dependencyGraph, folders, diagnosticCollection, rulesetsData);
      }
    }, 1000); 
  });
};




async function checkCompilable(
  filePath: string,
  fileData: { [key: string]: CodeResponse },
  FileDetectionData: { [key: string]: DetectionResponse },
  dependencyGraph: { [key: string]: Map<string, FileNode> },
  folders: string[],
  diagnosticCollection: vscode.DiagnosticCollection,
  rulesetsData: Rules
) {
  if (filePath.endsWith('.pyc') || filePath.includes('__pycache__')) {
    console.log(`Skipping non-source file: ${filePath}`);
    return;
  }
  
  const command = `python -m py_compile "${filePath}"`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Compilation error in file ${filePath}:`, stderr);
      const uri = vscode.Uri.file(filePath);
      const diagnostics: vscode.Diagnostic[] = [];
      const lines = stderr.split('\n');
      for (const line of lines) {
        const match = line.match(/File ".*", line (\d+),/);
        if (match) {
          const lineNumber = parseInt(match[1], 10) - 1;
          const range = new vscode.Range(lineNumber, 0, lineNumber, 100);
          const diagnostic = new vscode.Diagnostic(range, line, vscode.DiagnosticSeverity.Error);
          diagnostics.push(diagnostic);
        }
      }
      diagnosticCollection.set(uri, diagnostics);
    } else {
      console.log(`File ${filePath} compiled successfully.`);
      const uri = vscode.Uri.file(filePath);
      diagnosticCollection.delete(uri);

      // Perform static analysis
      await detectCodeSmells(dependencyGraph, fileData, folders, { [filePath]: fs.readFileSync(filePath, 'utf-8') }, FileDetectionData, rulesetsData);
      showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);
    }
  });
}