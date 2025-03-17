import { FileNode } from "../types/graph";
import { CodeResponse, DetectionResponse } from "../types/api";
import { Rules, FileSmellConfig } from "../types/rulesets";
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

/**
 * Checks if a file should be analyzed for a specific code smell
 * @param filePath The path of the file to check
 * @param codeSmell The code smell to check for
 * @param rulesetsData The ruleset configuration
 * @returns boolean indicating if the file should be analyzed for the given smell
 */
function shouldAnalyzeFile(filePath: string, codeSmell: string, rulesetsData: Rules): boolean {
    // Check if the file is explicitly excluded
    const isExcluded = rulesetsData.excludeFiles.some(excludeItem => {
        if (typeof excludeItem === 'string') {
            // If it's a wildcard or exact match
            return excludeItem === '*' || excludeItem === filePath;
        } else {
            // It's a FileSmellConfig object
            const config = excludeItem as FileSmellConfig;
            if (config.path === filePath) {
                // If the file path matches, check if the smell is excluded
                return config.smells.includes('*') || config.smells.includes(codeSmell);
            }
            return false;
        }
    });

    if (isExcluded) {
        // Check if the file is also explicitly included
        const isIncluded = rulesetsData.includeFiles.some(includeItem => {
            if (typeof includeItem === 'string') {
                // If it's a wildcard or exact match
                return false; // Exclusion takes precedence over wildcard inclusion
            } else {
                // It's a FileSmellConfig object
                const config = includeItem as FileSmellConfig;
                if (config.path === filePath) {
                    // If the file path matches, check if the smell is included
                    return config.smells.includes('*') || config.smells.includes(codeSmell);
                }
                return false;
            }
        });

        return isIncluded; // If excluded but also included, follow inclusion rule
    }

    // If not excluded, check if it's included
    const isIncluded = rulesetsData.includeFiles.some(includeItem => {
        if (typeof includeItem === 'string') {
            // If it's a wildcard or exact match
            return includeItem === '*' || includeItem === filePath;
        } else {
            // It's a FileSmellConfig object
            const config = includeItem as FileSmellConfig;
            if (config.path === filePath) {
                // If the file path matches, check if the smell is included
                return config.smells.includes('*') || config.smells.includes(codeSmell);
            }
            return false;
        }
    });

    return isIncluded;
}

/**
 * Filters the new files based on the ruleset configuration
 * @param newFiles The files to be analyzed
 * @param codeSmell The code smell being detected
 * @param rulesetsData The ruleset configuration
 * @returns Object containing only the files that should be analyzed
 */
function filterFilesByRules(
    newFiles: { [key: string]: string },
    codeSmell: string,
    rulesetsData: Rules
): { [key: string]: string } {
    const filteredFiles: { [key: string]: string } = {};
    
    for (const [filePath, content] of Object.entries(newFiles)) {
        if (shouldAnalyzeFile(filePath, codeSmell, rulesetsData)) {
            filteredFiles[filePath] = content;
        }
    }
    
    return filteredFiles;
}

export async function detectCodeSmells(
    dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules
) {
    try {
        const detectPromises = [];
          console.log("@@@@@@@@@@@@@@@@@@@----Detecting code smells----@@@@@@@@@@@@@@@");

        // Check if all smells should be detected
        if (rulesetsData.detectSmells.includes("*")) {
            // Dead code detection
            const deadCodeFiles = filterFilesByRules(newFiles, "dead code", rulesetsData);
            if (Object.keys(deadCodeFiles).length > 0) {
                detectPromises.push(getDeadCodeSmells(dependencyGraph, fileData, workspaceFolders, deadCodeFiles, FileDetectionData));
            }
            
            // Unreachable code detection
            const unreachableCodeFiles = filterFilesByRules(newFiles, "unreachable code", rulesetsData);
            if (Object.keys(unreachableCodeFiles).length > 0) {
                detectPromises.push(getUnreachableCodeSmells(fileData, unreachableCodeFiles, FileDetectionData));
            }
            
            // Temporary field detection
            const temporaryFieldFiles = filterFilesByRules(newFiles, "temporary field", rulesetsData);
            if (Object.keys(temporaryFieldFiles).length > 0) {
                detectPromises.push(getTemporaryFieldSmells(fileData, temporaryFieldFiles, FileDetectionData));
            }
            
            // Complex conditional detection
            const complexConditionalFiles = filterFilesByRules(newFiles, "overly complex conditional statements", rulesetsData);
            if (Object.keys(complexConditionalFiles).length > 0) {
                detectPromises.push(getComplexConditionalSmells(fileData, complexConditionalFiles, FileDetectionData));
            }
            
            // Global conflict detection
            const globalConflictFiles = filterFilesByRules(newFiles, "global variables conflict", rulesetsData);
            if (Object.keys(globalConflictFiles).length > 0) {
                detectPromises.push(getGlobalConflictSmells(fileData, globalConflictFiles, workspaceFolders, FileDetectionData));
            }
            
            // Magic numbers detection
            const magicNumberFiles = filterFilesByRules(newFiles, "magic numbers", rulesetsData);
            if (Object.keys(magicNumberFiles).length > 0) {
                detectPromises.push(getMagicNumberSmells(fileData, magicNumberFiles, FileDetectionData));
            }
            
            // Parameter list detection
            const parameterListFiles = filterFilesByRules(newFiles, "long parameter list", rulesetsData);
            if (Object.keys(parameterListFiles).length > 0) {
                detectPromises.push(getParameterListSmells(fileData, parameterListFiles, FileDetectionData));
            }
            
            // Unused variables detection
            const unusedVarFiles = filterFilesByRules(newFiles, "unused variables", rulesetsData);
            if (Object.keys(unusedVarFiles).length > 0) {
                detectPromises.push(getUnusedVarSmells(fileData, unusedVarFiles, FileDetectionData));
            }
            
            // Naming convention detection
            const namingConventionFiles = filterFilesByRules(newFiles, "naming convention", rulesetsData);
            if (Object.keys(namingConventionFiles).length > 0) {
                detectPromises.push(getNamingConventionSmells(fileData, namingConventionFiles, FileDetectionData));
            }
            
            // Duplicate code detection
            const duplicateCodeFiles = filterFilesByRules(newFiles, "duplicated code", rulesetsData);
            if (Object.keys(duplicateCodeFiles).length > 0) {
                detectPromises.push(getDuplicateCodeSmells(fileData, duplicateCodeFiles, FileDetectionData));
            }
        } else {
            // Detect only specific smells
            if (rulesetsData.detectSmells.includes("dead code")) {
                const deadCodeFiles = filterFilesByRules(newFiles, "dead code", rulesetsData);
                if (Object.keys(deadCodeFiles).length > 0) {
                    detectPromises.push(getDeadCodeSmells(dependencyGraph, fileData, workspaceFolders, deadCodeFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("unreachable code")) {
                const unreachableCodeFiles = filterFilesByRules(newFiles, "unreachable code", rulesetsData);
                if (Object.keys(unreachableCodeFiles).length > 0) {
                    detectPromises.push(getUnreachableCodeSmells(fileData, unreachableCodeFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("temporary field")) {
                const temporaryFieldFiles = filterFilesByRules(newFiles, "temporary field", rulesetsData);
                if (Object.keys(temporaryFieldFiles).length > 0) {
                    detectPromises.push(getTemporaryFieldSmells(fileData, temporaryFieldFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("overly complex conditional statements")) {
                const complexConditionalFiles = filterFilesByRules(newFiles, "overly complex conditional statements", rulesetsData);
                if (Object.keys(complexConditionalFiles).length > 0) {
                    detectPromises.push(getComplexConditionalSmells(fileData, complexConditionalFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("global variables conflict")) {
                const globalConflictFiles = filterFilesByRules(newFiles, "global variables conflict", rulesetsData);
                if (Object.keys(globalConflictFiles).length > 0) {
                    detectPromises.push(getGlobalConflictSmells(fileData, globalConflictFiles, workspaceFolders, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("magic numbers")) {
                const magicNumberFiles = filterFilesByRules(newFiles, "magic numbers", rulesetsData);
                if (Object.keys(magicNumberFiles).length > 0) {
                    detectPromises.push(getMagicNumberSmells(fileData, magicNumberFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("long parameter list")) {
                const parameterListFiles = filterFilesByRules(newFiles, "long parameter list", rulesetsData);
                if (Object.keys(parameterListFiles).length > 0) {
                    detectPromises.push(getParameterListSmells(fileData, parameterListFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("unused variables")) {
                const unusedVarFiles = filterFilesByRules(newFiles, "unused variables", rulesetsData);
                if (Object.keys(unusedVarFiles).length > 0) {
                    detectPromises.push(getUnusedVarSmells(fileData, unusedVarFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("naming convention")) {
                const namingConventionFiles = filterFilesByRules(newFiles, "naming convention", rulesetsData);
                if (Object.keys(namingConventionFiles).length > 0) {
                    detectPromises.push(getNamingConventionSmells(fileData, namingConventionFiles, FileDetectionData));
                }
            }
            
            if (rulesetsData.detectSmells.includes("duplicated code")) {
                const duplicateCodeFiles = filterFilesByRules(newFiles, "duplicated code", rulesetsData);
                if (Object.keys(duplicateCodeFiles).length > 0) {
                    detectPromises.push(getDuplicateCodeSmells(fileData, duplicateCodeFiles, FileDetectionData));
                }
            }
        }

        if (detectPromises.length > 0) {
            await Promise.all(detectPromises);
        }
        
        console.log("----------------File detection data-----------------");
        console.log(FileDetectionData);
        console.log("---------------------------------------------------");
    } catch (err) {
        console.error('Error during detection:', err);
    }
}