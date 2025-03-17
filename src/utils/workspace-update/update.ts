import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import { FileNode } from '../../types/graph';
import { detectCodeSmells } from '../../codeSmells/detection';
import { CodeResponse, DetectionResponse } from '../../types/api';
import { showCodeSmellsInProblemsTab } from '../ui/problemsTab';
import { Rules, FileSmellConfig } from '../../types/rulesets';

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

/**
 * Determines if any smell should be checked for a specific file
 * @param filePath The path of the file
 * @param rulesetsData The ruleset configuration
 * @returns boolean indicating if any smell should be checked
 */
function shouldCheckFile(filePath: string, rulesetsData: Rules): boolean {
  // Check if file is in excludeFiles with wildcard
  const hasWildcardExclusion = rulesetsData.excludeFiles.some(
    item => typeof item === 'string' && item === '*'
  );
  
  // Check if file is specifically excluded
  const isSpecificallyExcluded = rulesetsData.excludeFiles.some(
    item => typeof item === 'string' && item === filePath
  );
  
  // Check if file has any specific smell exclusions (we'll allow checking other smells)
  const hasSpecificExclusions = rulesetsData.excludeFiles.some(
    item => typeof item === 'object' && (item as FileSmellConfig).path === filePath
  );
  
  // If file is completely excluded (not just specific smells)
  if (isSpecificallyExcluded || (hasWildcardExclusion && !hasSpecificExclusions)) {
    // Check if it's specifically included despite exclusion
    const isSpecificallyIncluded = rulesetsData.includeFiles.some(
      item => typeof item === 'string' && item === filePath
    );
    
    const hasSpecificInclusions = rulesetsData.includeFiles.some(
      item => typeof item === 'object' && (item as FileSmellConfig).path === filePath
    );
    
    return isSpecificallyIncluded || hasSpecificInclusions;
  }
  
  // If not completely excluded, check if it's included
  const hasWildcardInclusion = rulesetsData.includeFiles.some(
    item => typeof item === 'string' && item === '*'
  );
  
  const isSpecificallyIncluded = rulesetsData.includeFiles.some(
    item => typeof item === 'string' && item === filePath
  );
  
  const hasSpecificInclusions = rulesetsData.includeFiles.some(
    item => typeof item === 'object' && (item as FileSmellConfig).path === filePath
  );
  
  return hasWildcardInclusion || isSpecificallyIncluded || hasSpecificInclusions;
}

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
  
  // Check if the file should be analyzed based on ruleset configuration
  if (!shouldCheckFile(filePath, rulesetsData)) {
    console.log(`Skipping file based on ruleset configuration: ${filePath}`);
    
    // Remove any existing diagnostics for this file
    diagnosticCollection.delete(vscode.Uri.file(filePath));
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