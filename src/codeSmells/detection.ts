import { FileNode } from "../types/graph";
import { CodeResponse, DeadCodeResponse, DetectionResponse } from "../types/api";
import { getDeadCodeSmells } from "./analysis/dead_smells";
import { getUnreachableCodeSmells } from "./analysis/unreachable_smell";
import { getTemporaryFieldSmells } from "./analysis/temporary_field";
import { getComplexConditionalSmells } from "./analysis/overly_complex";
import { getGlobalConflictSmells } from "./analysis/global_conflict";
import { getMagicNumberSmells } from "./analysis/magic_numbers";
import { getParameterListSmells } from "./analysis/long_parameter_list";
import { getUnusedVarSmells } from "./analysis/unused_var_smell";
import { getNamingConventionSmells } from "./analysis/naming_convention";
import { getDuplicateCodeSmells } from "./analysis/duplicate_smells";
import { Rules } from '../types/rulesets';
import { detectionLog } from "../utils/api/log_api/detection_logs";
import { shouldDetectFile } from "../utils/workspace-update/ruleset_checks";
import * as path from 'path';
import * as vscode from 'vscode';
import { showCodeSmellsInProblemsTab } from "../utils/ui/problemsTab";
import { diagnosticCollection } from "../extension";

export async function detectCodeSmells(dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules,
    context: vscode.ExtensionContext,
) {
    console.log("Running detection with ruleset configuration:", rulesetsData);
    let detectionData: { [key: string]: DetectionResponse } = {};
    try {
        // For each code smell type, create a filtered files object containing only files
        // that should be analyzed for that particular smell type
        
        // Dead code detection
        const deadCodeFiles = filterFilesBySmellType(newFiles, rulesetsData, "dead code");
        const deadCodeDetection = getDeadCodeSmells(dependencyGraph, fileData, workspaceFolders, deadCodeFiles, detectionData, rulesetsData);
        
        // Unreachable code detection
        const unreachableCodeFiles = filterFilesBySmellType(newFiles, rulesetsData, "unreachable code");
        const unreachableCodeDetection = getUnreachableCodeSmells(fileData, unreachableCodeFiles, detectionData, rulesetsData);
        
        // Temporary field detection
        const temporaryFieldFiles = filterFilesBySmellType(newFiles, rulesetsData, "temporary field");
        const temporaryFieldDetection = getTemporaryFieldSmells(fileData, temporaryFieldFiles, detectionData, rulesetsData);
        
        // Complex conditional detection
        const complexConditionalFiles = filterFilesBySmellType(newFiles, rulesetsData, "overly complex conditional statements");
        const complexConditionalDetection = getComplexConditionalSmells(fileData, complexConditionalFiles, detectionData, rulesetsData);
        
        // Global conflict detection
        const globalConflictFiles = filterFilesBySmellType(newFiles, rulesetsData, "global variables conflict");
        const globalConflictDetection = getGlobalConflictSmells(fileData, globalConflictFiles, workspaceFolders, detectionData, rulesetsData);
        
        // Magic numbers detection
        const magicNumbersFiles = filterFilesBySmellType(newFiles, rulesetsData, "magic numbers");
        const magicNumbersDetection = getMagicNumberSmells(fileData, magicNumbersFiles, detectionData, rulesetsData);
        
        // Long parameter list detection
        const longParameterListFiles = filterFilesBySmellType(newFiles, rulesetsData, "long parameter list");
        const longParameterListDetection = getParameterListSmells(fileData, longParameterListFiles, detectionData, rulesetsData);
        
        // Unused variables detection
        const unusedVarsFiles = filterFilesBySmellType(newFiles, rulesetsData, "unused variables");
        const unusedVarsDetection = getUnusedVarSmells(fileData, unusedVarsFiles, detectionData, rulesetsData);
        
        // Naming convention detection
        const namingConventionFiles = filterFilesBySmellType(newFiles, rulesetsData, "naming convention");
        const namingConventionDetection = getNamingConventionSmells(fileData, namingConventionFiles, detectionData, rulesetsData);
        
        // Duplicate code detection
        const duplicateCodeFiles = filterFilesBySmellType(newFiles, rulesetsData, "duplicated code");
        const duplicateCodeDetection = getDuplicateCodeSmells(fileData, duplicateCodeFiles, detectionData, rulesetsData);
        
        // Run all detections in parallel
        await Promise.all([
            deadCodeDetection,
            unreachableCodeDetection,
            temporaryFieldDetection,
            complexConditionalDetection,
            globalConflictDetection,
            magicNumbersDetection,
            longParameterListDetection,
            unusedVarsDetection,
            namingConventionDetection,
            duplicateCodeDetection
        ]);
        
        console.log("Detection complete, results:", FileDetectionData);
        console.log("Detection data:", detectionData);
        const workspace = vscode.workspace.workspaceFolders;
        if (workspace === undefined) {
            throw new Error('No workspace folders found');
        }
        Object.assign(FileDetectionData, detectionData);
        context.workspaceState.update('FileDetectionData', FileDetectionData);
        detectionLog(detectionData, path.basename(workspace[0].uri.fsPath), 'General', 'automatic');
        showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);

        
    }
    catch(err) {
        console.error('Error during detection:', err);
    }
}

// Helper function to filter files by smell type
function filterFilesBySmellType(
    allFiles: { [key: string]: string }, 
    rulesetsData: Rules, 
    smellType: string
): { [key: string]: string } {
    const filteredFiles: { [key: string]: string } = {};
    
    for (const [filePath, content] of Object.entries(allFiles)) {
        if (shouldDetectFile(filePath, rulesetsData, smellType)) {
            filteredFiles[filePath] = content;
        }
    }
    
    return filteredFiles;
}