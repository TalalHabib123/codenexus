import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import { FileNode } from '../../types/graph';
import { detectCodeSmells } from '../../codeSmells/detection';
import { CodeResponse, DetectionResponse } from '../../types/api';
import{showCodeSmellsInProblemsTab} from '../ui/problemsTab';
import { Rules } from '../../types/rulesets';


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
    checkCompilable(uri.fsPath, fileData, FileDetectionData, dependencyGraph, folders,diagnosticCollection, rulesetsData);
  });

  fileWatcher.onDidDelete(uri => {
    // Remove the file from the dependency graph
    console.log(`File deleted: ${uri.fsPath}`);
    // TODO: Add logic to remove the file from dependencyGraph if necessary.
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
    console.log(`Skipping non-source fileS: ${filePath}`);
    return;
  }

  const command = `python -m py_compile ${filePath}`;

  exec(command, async (err, stdout, stderr) => {
    if (err) {
      console.error(`Error compiling ${filePath}:`, stderr);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const newFile = { [filePath]: content };

      // Detect code smells after successful compilation
      await detectCodeSmells(dependencyGraph, fileData, folders, newFile, FileDetectionData, rulesetsData);
       // Show detected code smells in the Problems tab
    showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);
    } catch (readError) {
      console.error(`Error reading file ${filePath}:`, readError);
    }
  });
}
