import { FileNode, DependentNode } from '../types/graph';
import { DeadCodeResponse, DetectionResponse } from '../types/api';
import {
    Dependency,
    UnreachableCodeRequest,
    MagicNumberRefactorRequest,
    UnusedVariablesRefactorRequest,
} from "../types/refactor_models";
import * as vscode from 'vscode';

import { RefactorResponse, RefactoringData } from '../types/refactor_models';
import { refactorNamingConvention } from '../utils/refactor_api/naming_convention_api';
import { refactorDeadCode } from '../utils/refactor_api/dead_code_api';
import { sendFileForUnreachableCodeAnalysis } from '../utils/refactor_api/unreachable_code_api';
import { refactorMagicNumbers } from '../utils/refactor_api/magic_number_api';
import { refactorUnusedVars } from '../utils/refactor_api/unused_var_api';
import { randomUUID } from 'crypto';
import { triggerRefactoring } from '../extension';
import { refactorLogs } from '../utils/api/log_api/refactor_logs';
import path from 'path';
import { DiagnosticRefactorProvider } from '../utils/diagnosisRefactor';




export const refactor = async (
    diagnostic: vscode.Diagnostic, // Diagnostic structure
    filePath: string, // Path to the file being refactored
    dependencyGraph: { [key: string]: Map<string, FileNode> }, // Nested dependency graph
    FileDetectionData: { [key: string]: DetectionResponse }, // Detection data
    refactorData: { [key: string]: Array<RefactoringData> }, // Refactor data
    context: vscode.ExtensionContext
): Promise<RefactorResponse | undefined> => {
    try {
        const message = diagnostic.message;
        console.log("Diagnostic message:", message);
        if (diagnostic.message.includes("Inconsistent naming convention")) {
            const dependencyData = await getDependencyData(dependencyGraph, filePath);
            const codeSmellData = FileDetectionData[filePath]?.naming_convention?.data;

            if (codeSmellData && "inconsistent_naming" in codeSmellData) {
                const inconsistentNamingData = codeSmellData.inconsistent_naming;
                const target_convention = inconsistentNamingData?.reduce((prev, current) =>
                    current.type_count > prev.type_count ? current : prev
                );

                if (target_convention?.type) {
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

                        console.log("Refactor successful:", response.data);
                        const newRefactrData: RefactoringData = {
                            orginal_code: fileContent,
                            refactored_code: response.data.refactored_code,
                            refactoring_type: "Inconsistent Naming Convention",
                            time: new Date(),
                            cascading_refactor: false,
                            job_id: randomUUID(),
                            ai_based: false,
                            files_affected: [],
                            outdated: false,
                            success: true,
                            error: "",
                        };
                        const effectedFiles: string[] = [];
                        dependencyData?.forEach((dependency) => {
                            if (dependency.valid && !effectedFiles.includes(dependency.name)
                                && dependency.name !== filePath && dependency.weight?.some(w => w.source === "Exporting")) {
                                effectedFiles.push(dependency.name);
                            }
                        });
                        if (effectedFiles.length > 0) {
                            newRefactrData.files_affected = effectedFiles;
                            newRefactrData.cascading_refactor = true;
                        }
                        if (!refactorData[filePath]) {
                            refactorData[filePath] = [];
                        }
                        for (let i = 0; i < refactorData[filePath].length; i++) {
                            if (refactorData[filePath][i].refactoring_type === "Inconsistent Naming Convention") {
                                refactorData[filePath][i].outdated = true;
                            }
                        }
                        refactorData[filePath].push(newRefactrData);
                        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
                        refactorLogs(filePath, newRefactrData, path.basename(root));
                        console.log("Refactor data:", refactorData);
                        return response.data;
                    }
                }
            }
        } else if (diagnostic.message.includes("dead code") || diagnostic.message.includes("Function was defined but never used") || diagnostic.message.includes("Global Variable was defined but never used")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            const data = FileDetectionData[filePath]?.dead_code;
            let updatedCode: RefactorResponse = { success: false, refactored_code: fileContent };
            if (data && data.success) {
                console.log("Dead Code data", data);
                if (diagnostic.message.includes("contains dead code") &&
                    "class_details" in data && Array.isArray(data.class_details) && data.class_details.length > 0) {
                    // data.class_details.forEach(async (classDetail: any) => {
                    const className = diagnostic.message.split(" ").shift() || "";
                    const classDetail = data.class_details.find((classDetail: any) => classDetail.class_name === className);

                    if (!classDetail.has_instance) {
                        const refactorRequest = {
                            code: updatedCode.refactored_code,
                            entity_name: classDetail.class_name,
                            entity_type: "class",
                            dependencies: []
                        };
                        const response = await refactorDeadCode(refactorRequest);
                        updatedCode = response?.data || updatedCode;
                    }
                    // });
                }
                if (diagnostic.message.includes("Function was defined but never used") &&
                    "function_names" in data && Array.isArray(data.function_names) && data.function_names.length > 0) {
                    let name = diagnostic.message.split(" ").shift() || "";
                    // remove the last element from the name
                    name = name.slice(0, -1);
                    const refactorRequest = {
                        code: updatedCode.refactored_code,
                        entity_name: name,
                        entity_type: "function",
                        dependencies: []
                    };
                    const response = await refactorDeadCode(refactorRequest);
                    updatedCode = response?.data || updatedCode;
                }
                if (diagnostic.message.includes("Global Variable was defined but never used") &&
                    "global_variables" in data && Array.isArray(data.global_variables) && data.global_variables.length > 0) {
                    // data.global_variables.forEach(async (name: any) => {

                    let name = diagnostic.message.split(" ").shift() || "";
                    name = name.slice(0, -1);
                    const refactorRequest = {
                        code: updatedCode.refactored_code,
                        entity_name: name,
                        entity_type: "variable",
                        dependencies: []
                    };
                    const response = await refactorDeadCode(refactorRequest);
                    updatedCode = response?.data || updatedCode;
                    // });
                }
                if ("imports" in data &&
                    typeof data.imports === "object" &&
                    data.imports !== null &&
                    "dead_imports" in data.imports &&
                    Array.isArray(data.imports.dead_imports) &&
                    data.imports.dead_imports.length > 0) {
                    data.imports.dead_imports.forEach(async (name: any) => {
                        const refactorRequest = {
                            code: updatedCode.refactored_code,
                            entity_name: name,
                            entity_type: "import",
                            dependencies: []
                        };
                        const response = await refactorDeadCode(refactorRequest);
                        updatedCode = response?.data || updatedCode;
                    });
                }

                const newRefactrData: RefactoringData = {
                    orginal_code: fileContent,
                    refactored_code: updatedCode.refactored_code,
                    refactoring_type: "Dead Code",
                    time: new Date(),
                    cascading_refactor: false,
                    job_id: randomUUID(),
                    ai_based: false,
                    files_affected: [],
                    outdated: false,
                    success: true,
                    error: "",
                };
                if (!refactorData[filePath]) {
                    refactorData[filePath] = [];
                }
                for (let i = 0; i < refactorData[filePath].length; i++) {
                    if (refactorData[filePath][i].refactoring_type === "Dead Code") {
                        refactorData[filePath][i].outdated = true;
                    }
                }
                refactorData[filePath].push(newRefactrData);
                const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
                refactorLogs(filePath, newRefactrData, path.basename(root));
                return updatedCode;
            }
        } else if (diagnostic.message.includes("Unreachable code")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);

            const data = FileDetectionData[filePath]?.unreachable_code;
            console.log("data", data);
            if (data && "unreachable_code" in data && Array.isArray(data.unreachable_code)) {
                console.log("Unreachable Code data", data.unreachable_code);
                const unreachable_lines = data?.unreachable_code?.map((line: string) => {
                    const lastElement = line.split(" ").pop();
                    return lastElement !== undefined ? parseInt(lastElement, 10) : NaN;
                });
                console.log("Unreachable lines:", unreachable_lines);
                const refactorRequest: UnreachableCodeRequest = {
                    code: fileContent,
                    unreachable_code_lines: unreachable_lines || [],
                };
                const refactoredCode = await sendFileForUnreachableCodeAnalysis(filePath, refactorRequest);
                console.log("Refactored code", refactoredCode);
                if (refactoredCode && refactoredCode.success) {
                    console.log("Refactor successful:", refactoredCode.refactored_code);
                    const newRefactrData: RefactoringData = {
                        orginal_code: fileContent,
                        refactored_code: refactoredCode.refactored_code,
                        refactoring_type: "Unreachable Code",
                        time: new Date(),
                        cascading_refactor: false,
                        job_id: randomUUID(),
                        ai_based: false,
                        files_affected: [],
                        outdated: false,
                        success: true,
                        error: "",
                    };

                    if (!refactorData[filePath]) {
                        refactorData[filePath] = [];
                    }
                    for (let i = 0; i < refactorData[filePath].length; i++) {
                        if (refactorData[filePath][i].refactoring_type === "Unreachable Code") {
                            refactorData[filePath][i].outdated = true;
                        }
                    }
                    refactorData[filePath].push(newRefactrData);
                    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
                    refactorLogs(filePath, newRefactrData, path.basename(root));
                }
                return refactoredCode || undefined;
            }

        } else if (diagnostic.message.includes("Magic number")) {
            // Refactor magic numbers
            const MagicNumber = diagnostic.message.split(" ").pop();
            const magicNumber = parseInt(MagicNumber || "", 10);
            const lineNumber = diagnostic.range.start.line;
            console.log("Magic number:", magicNumber);
            console.log("Line number:", lineNumber);
            console.log("line number type: ", typeof (lineNumber));
            console.log("magic_number type", typeof (magicNumber));
            const magic_numbers = [
                {
                    magic_number: magicNumber,
                    line_number: lineNumber,
                },
            ];
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            const fileContent = new TextDecoder().decode(fileData);

            const data: MagicNumberRefactorRequest = {
                code: fileContent,
                magic_numbers: magic_numbers,
                dependencies: []
            };
            const response = await refactorMagicNumbers(data);
            if (response.data.success) {
                console.log("Refactor successful:", response.data.refactored_code);
                const newRefactrData: RefactoringData = {
                    orginal_code: fileContent,
                    refactored_code: response.data.refactored_code,
                    refactoring_type: "Magic Number",
                    time: new Date(),
                    cascading_refactor: false,
                    job_id: randomUUID(),
                    ai_based: false,
                    files_affected: [],
                    outdated: false,
                    success: true,
                    error: "",
                };
                if (!refactorData[filePath]) {
                    refactorData[filePath] = [];
                }
                for (let i = 0; i < refactorData[filePath].length; i++) {
                    if (refactorData[filePath][i].refactoring_type === "Magic Number") {
                        refactorData[filePath][i].outdated = true;
                    }
                }
                refactorData[filePath].push(newRefactrData);
                const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
                refactorLogs(filePath, newRefactrData, path.basename(root));
            }
            return response.data;

        } else if (diagnostic.message.includes("Unused variable")) {
            // Refactor unused variables
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            const fileContent = new TextDecoder().decode(fileData);

            const unused_variables = diagnostic.message.split(" ").pop() || "";
            console.log("Unused variable:", unused_variables);
            const data: UnusedVariablesRefactorRequest = {
                code: fileContent,
                unused_variables: [unused_variables],
                dependencies: [],
            };
            const response = await refactorUnusedVars(data);
            if (response.data.success) {
                console.log("Refactor successful:", response.data.refactored_code);
                const newRefactrData: RefactoringData = {
                    orginal_code: fileContent,
                    refactored_code: response.data.refactored_code,
                    refactoring_type: "Unused Variable",
                    time: new Date(),
                    cascading_refactor: false,
                    job_id: randomUUID(),
                    ai_based: false,
                    files_affected: [],
                    outdated: false,
                    success: true,
                    error: "",
                };
                if (!refactorData[filePath]) {
                    refactorData[filePath] = [];
                }
                for (let i = 0; i < refactorData[filePath].length; i++) {
                    if (refactorData[filePath][i].refactoring_type === "Unused Variable") {
                        refactorData[filePath][i].outdated = true;
                    }
                }
                refactorData[filePath].push(newRefactrData);
                const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
                refactorLogs(filePath, newRefactrData, path.basename(root));
            }
            return response.data;
        }

        else if (diagnostic.message.includes("God object")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName: string = "";
            const arr = diagnostic.message.split(" ");
            while (refactorName === "") {
                let str = arr.pop();
                if (typeof str === "string" && str.length > 0) {
                    refactorName = str;
                }
            }
            triggerRefactoring("god_object", filePath, refactorName, context);
        }

        else if (diagnostic.message.includes("Long function")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName: string = "";
            const arr = diagnostic.message.split(" ");
            while (refactorName === "") {
                let str = arr.pop();
                if (typeof str === "string" && str.length > 0) {
                    refactorName = str;
                }
            }
            triggerRefactoring("long_function", filePath, refactorName, context);
        }

        else if (diagnostic.message.includes("Feature envy")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName: string = "";
            const arr = diagnostic.message.split(" ");
            while (refactorName === "") {
                let str = arr.pop();
                if (typeof str === "string" && str.length > 0) {
                    refactorName = str;
                }
            }
            triggerRefactoring("feature_envy", filePath, refactorName, context);
        }

        else if (diagnostic.message.includes("Inappropriate intimacy")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName: string = "";
            const arr = diagnostic.message.split(" ");
            while (refactorName === "") {
                let str = arr.pop();
                if (typeof str === "string" && str.length > 0) {
                    refactorName = str;
                }
            }
            triggerRefactoring("inappropriate_intimacy", filePath, refactorName, context);
        }

        else if (diagnostic.message.includes("Switch statement abuser")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName: string = "";
            const arr = diagnostic.message.split(" ");
            while (refactorName === "") {
                let str = arr.pop();
                if (typeof str === "string" && str.length > 0) {
                    refactorName = str;
                }
            }
            triggerRefactoring("switch_statement_abuser", filePath, refactorName, context);
        }

        else if (diagnostic.message.includes("Excessive flags")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName: string = "";
            const arr = diagnostic.message.split(" ");
            while (refactorName === "") {
                let str = arr.pop();
                if (typeof str === "string" && str.length > 0) {
                    refactorName = str;
                }
            }
            triggerRefactoring("excessive_flags", filePath, refactorName, context);
        }

        else if (diagnostic.message.includes("Middle Man")) {
            const uri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(uri);
            let fileContent = new TextDecoder().decode(fileData);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName: string = "";
            const arr = diagnostic.message.split(" ");
            while (refactorName === "") {
                let str = arr.pop();
                if (typeof str === "string" && str.length > 0) {
                    refactorName = str;
                }
            }
            triggerRefactoring("middle_man", filePath, refactorName, context);
        }

        else if (diagnostic.message.includes("Overly complex condition")) {
            const uri = vscode.Uri.file(filePath);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);

            triggerRefactoring("conditionals", filePath, null, context);
        }

        else if (diagnostic.message.includes("Temporary detected")) {
            const uri = vscode.Uri.file(filePath);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);

            triggerRefactoring("temporary_field", filePath, null, context);
        }

        else if (diagnostic.message.includes("Global Variale Conflict")) {
            const uri = vscode.Uri.file(filePath);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);

            triggerRefactoring("global_conflict", filePath, null, context);
        }

        else if (diagnostic.message.includes("Duplicated code")) {
            const uri = vscode.Uri.file(filePath);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);

            triggerRefactoring("duplicate_code", filePath, null, context);
        }

        else if (diagnostic.message.includes("Long parameter list detected")) {
            const uri = vscode.Uri.file(filePath);
            console.log(FileDetectionData[filePath]);
            console.log(FileDetectionData[filePath]?.user_triggered_detection);
            let refactorName = "";
            const match = diagnostic.message.match(/Long parameter list detected: (.+?) with \d+ parameters/);

            if (match && match[1]) {
                refactorName = match[1].replace(/\(.*?\)$/, ""); // Remove everything inside and including ()
            }
            const additional: Record<string, any> = {};
            additional["task_name"] = refactorName;
            additional["additional_data"] = await getDependeciesFunction(filePath, refactorName, dependencyGraph);
            const bytes = await vscode.workspace.fs.readFile(uri);
            additional["additional_data"][filePath] = new TextDecoder().decode(bytes);
            console.log("Additional data for long parameter list:", additional);

            triggerRefactoring("long_parameter_list", filePath, additional, context);
        }

        return undefined;

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

    const depMap = Array.from(dependencies).map(dependence => dependence.weight.every(weight => weight.source === "Exporting") ? dependence : null).filter(dependence => dependence !== null);
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

const getDependeciesFunction = async (
    filepath: string,
    functionName: string,
    dependencyGraph: { [workspaceRoot: string]: Map<string, FileNode> }
): Promise<Record<string, string> | null> => {
    /* 1. Locate the FileNode that represents `filepath` in any workspace folder */
    const workspaceFolders =
        vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) ?? [];

    let fileNode: FileNode | undefined;
    for (const root of workspaceFolders) {
        fileNode = dependencyGraph[root]?.get(filepath);
        if (fileNode) { break; } // found it
    }
    if (!fileNode) { return null; }

    /* 2. Filter its dependencies: keep those that import the function */
    const depsUsingFn = [...fileNode.dependencies].filter(dep =>
        dep.weight.some(
            w => w.source === 'Exporting' && w.name === functionName && w.type === 'function'
        )
    );
    if (depsUsingFn.length === 0) { return null; }

    /* 3. Read all dependent files in parallel */
    const additionalData: Record<string, string> = {};
    await Promise.all(
        depsUsingFn.map(async dep => {
            const uri = vscode.Uri.file(dep.name);           // dep.name is the path
            const bytes = await vscode.workspace.fs.readFile(uri);
            additionalData[dep.name] = new TextDecoder().decode(bytes);
        })
    );

    return additionalData;
};