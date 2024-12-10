import { FileNode, DependentNode } from '../types/graph';
import { DetectionResponse } from '../types/api';
import { Dependency, UnreachableCodeRequest } from "../types/refactor_models";
import * as vscode from 'vscode';

import { RefactorResponse } from '../types/refactor_models';
import {refactorNamingConvention} from '../utils/refactor_api/naming_convention_api';
import { refactorDeadCode } from '../utils/refactor_api/dead_code_api';
import { sendFileForUnreachableCodeAnalysis } from '../utils/refactor_api/unreachable_code_api';
import { parse } from 'path';


export const refactor = async (
    diagnostic: vscode.Diagnostic, // Diagnostic structure
    filePath: string, // Path to the file being refactored
    dependencyGraph: { [key: string]: Map<string, FileNode> }, // Nested dependency graph
    FileDetectionData: { [key: string]: DetectionResponse } // Detection data
): Promise<RefactorResponse | undefined> => {
    try {
        const message = diagnostic.message;
        console.log("Diagnostic message:", message);

        if (diagnostic.message.includes("Inconsistent naming convention")) {
            const dependencyData = await getDependencyData(dependencyGraph, filePath);
            console.log("Dependency data:", dependencyData);
            const codeSmellData = FileDetectionData[filePath]?.naming_convention?.data;

            if (codeSmellData && "inconsistent_naming" in codeSmellData) {
                const inconsistentNamingData = codeSmellData.inconsistent_naming;
                const target_convention = inconsistentNamingData?.reduce((prev, current) =>
                    current.type_count > prev.type_count ? current : prev
                );
                console.log("Target convention:", target_convention);

                if (target_convention?.type) {
                    console.log("Target convention:", target_convention.type);
                    const uri = vscode.Uri.file(filePath);
                    const fileData = await vscode.workspace.fs.readFile(uri);
                    const fileContent = new TextDecoder().decode(fileData);
                    const refactorRequest = {
                        code: fileContent,
                        target_convention: target_convention.type,
                        naming_convention: "camelCase",
                        dependencies: dependencyData,
                    };
                    const response = await refactorNamingConvention(refactorRequest);
                    if (response.data.success) {
                        console.log("Refactor successful:", response.data.refactored_code);
                        return response.data;
                    }
                }
            }
        } else if (diagnostic.message.includes("dead code")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            //console.log("FileDetection", FileDetectionData[filePath].dead_code);
            const data = FileDetectionData[filePath]?.dead_code;
            console.log("data",data);
           
            if (data && data.success) {
                console.log("Dead Code data", data);
               
                    // Process dead classes
    // if (data.class_details && data.class_details.length > 0) {
    //     for (const classDetail of data.class_details) {
    //         if (!classDetail.has_instance) {
    //             const refactorRequest = {
    //                 code: fileContent,
    //                 entity_name: classDetail.class_name,
    //                 entity_type: 'class',
    //                 // Include dependencies if necessary
    //             };
    //             const refactoredCode = await refactorDeadCode(filePath, refactorRequest);
    //             if (refactoredCode) {
    //                 fileContent = refactoredCode;
    //             }
    //         }
    //     }
    // }
            }
        }else if (diagnostic.message.includes("Unreachable code")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            
            const data = FileDetectionData[filePath]?.unreachable_code;
            console.log("data",data);
            if (data && "unreachable_code" in data && Array.isArray(data.unreachable_code)) {
                console.log("Unreachable Code data", data.unreachable_code);
                const unreachable_lines = data?.unreachable_code?.map((line: string) => {
                    const lastElement = line.split(" ").pop();
                    return lastElement !== undefined ? parseInt(lastElement, 10) : NaN;
                });
                console.log("Unreachable lines:", unreachable_lines);
                const refactorRequest:UnreachableCodeRequest = {
                    code: fileContent,
                    unreachable_code_lines: unreachable_lines || [],
                };
                const refactoredCode = await sendFileForUnreachableCodeAnalysis(filePath, refactorRequest);
                console.log("Refactored code", refactoredCode);
                return refactoredCode || undefined;
            }
                   
        
           
            
        } else if (diagnostic.message.includes("Magic number")) {
            // Refactor magic numbers
        } else if (diagnostic.message.includes("Unused variable")) {
            // Refactor unused variables
        }

    } catch (e) {
        console.error("Error in refactoring:", e);
    }
};


const getDependencyData = async (
    dependencyGraph: { [key: string]: Map<string, FileNode> }, // Nested dependency graph
    filePath: string // Path to the file being refactored
) => {
    const dependencyMapKey = Object.keys(dependencyGraph).find((key) =>
        dependencyGraph[key].has(filePath)
    );

    if (!dependencyMapKey) {
        console.error(`No matching dependency map found for ${filePath}.`);
        return;
    }
    const dependencyMap = dependencyGraph[dependencyMapKey]; // Access the inner map
    // Retrieve dependencies
    const dependencies = getDependencies(filePath, dependencyMap);
    if (!dependencies) {
        console.error("No dependencies found for the file:", filePath);
        return;
    }
    let dependencyData: Dependency[] = [];
    
    const depMap = Array.from(dependencies).map( dependence => dependence.weight.every( weight => weight.source === "Exporting")? dependence : null).filter( dependence => dependence !== null);
    const promises = depMap.map(async (dep) => {
            const uri = vscode.Uri.file(dep.name);
            const fileData = await vscode.workspace.fs.readFile(uri);
            const fileContent = new TextDecoder().decode(fileData); // Assign file content
            dependencyData.push({
                name: dep.name,
                valid: true, // Mark as valid since it passed the filtering
                fileContent: fileContent,
                weight: dep.weight.map((weight: any) => ({
                    name: weight.name,
                    type: weight.type,
                    alias: weight.alias || undefined, // Optional alias
                    source: weight.source, // Ensure it matches 'Exporting' | 'Importing'
                })),
            });
    });
    
    await Promise.all(promises); // Wait for all file reads to complete
    console.log("THIS IS THE DEPENDENCY DATA: ", dependencyData);
    return dependencyData;
};
const getDependencies = (
    filePath: string,
    dependencyMap: Map<string, FileNode> // Inner Map corresponding to a specific key in the dependencyGraph
): Set<DependentNode> | null => {
     // Check if the filePath exists in the dependency map
    const fileNode = dependencyMap.get(filePath);
    if (!fileNode) {
        console.error(`File ${filePath} not found in the dependency map.`);
        return null;
    }

    // Retrieve dependencies for the file
    const dependencies = fileNode.dependencies;

    // Log dependencies for debugging purposes
    console.log(`Dependencies for ${filePath}:`, dependencies);

    return dependencies;
};
