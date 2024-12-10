import { FileNode, DependentNode } from '../types/graph';
import { DetectionResponse } from '../types/api';
import { Dependency } from "../types/refactor_models"
import * as vscode from 'vscode';

export const refactor = async (
    diagnostic: vscode.Diagnostic, // Diagnostic structure
    filePath: string, // Path to the file being refactored
    dependencyGraph: { [key: string]: Map<string, FileNode> }, // Nested dependency graph
    FileDetectionData: { [key: string]: DetectionResponse } // Detection data
): Promise<string | void> => {
    try {
        const message = diagnostic.message;
        
        if (diagnostic.message.includes("Inconsistent naming convention"))
        {
            console.log("------------------------------------------------------------------------");
            console.log(await getDependencyData(dependencyGraph, filePath));
        }
        // // Log weights of all dependencies
        
        // console.log("All dependencies processed:", depMap);
        // const uri = vscode.Uri.file(filePath); // Create a Uri from the file path
        // const fileData = await vscode.workspace.fs.readFile(uri);
        // console.log("THIS IS THE DEPENDENCY MAP" , depMap);
        // dependencies.forEach((dependency) => {
        //     if (dependency.weight) {
        //         if (dependency.weight.every( weight => weight.source === "Exporting"))
        //         console.log(`Weight for ${dependency.name}:`, dependency.weight);
        //         dependency.weight.forEach (weight => {
        //             console.log(weight.source);
        //         });
        //     }
        // });

        // Additional refactoring logic here...
    } catch (err) {
        console.error("Error during refactoring:", err);
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
    // Ensure the dependency map is a Map

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
