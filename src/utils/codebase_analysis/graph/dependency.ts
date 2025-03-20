import { FileNode, UtilizedEntity, DependentNode } from "../../../types/graph";
import { FolderStructure } from "../../../types/folder";
import { CodeResponse } from "../../../types/api";
import { getFilePath_From, getFilePath_Import } from "./import_handler";
import path from "path";
import { dependencyGraphLog } from "../../api/log_api/dependency-graph";
import * as vscode from 'vscode';

function importEverything(importfilepath: string, fileData: { [key: string]: CodeResponse }, alias: string): UtilizedEntity[] {
    const utilizedentities: UtilizedEntity[] = [];
    let append_name = "";
    if (alias !== "") {
        append_name = alias + ".";
    }
    else 
    {
        append_name = path.basename(importfilepath).replace(".py", ".");
    }

    for (const [fileName, data] of Object.entries(fileData)) {
        if (fileName !== importfilepath) {
            continue;
        }
        if (data.error) {
            utilizedentities.push({
                name: fileName,
                type: 'error',
                source: 'Importing'
            });
        }

        if (data.function_names) {
            for (const functionName of data.function_names) {
                utilizedentities.push({
                    name: append_name + functionName,
                    type: 'function',
                    source: 'Importing'
                });
            }
        }
        if (data.class_details) {
            for (const classDetail of data.class_details) {
                utilizedentities.push({
                    name: append_name + classDetail[Object.keys(classDetail)[0]] as string,
                    type: 'class',
                    source: 'Importing'
                });
            }
        }

        if (data.global_variables) {
            for (const globalVariable of data.global_variables) {
                utilizedentities.push({
                    name: append_name + globalVariable.variable_name,
                    type: 'variable',
                    source: 'Importing'
                });
            }
        }
    }

    return utilizedentities;
}
function exportEverything(exportfilepath: string, fileData: { [key: string]: CodeResponse }, alias: string): UtilizedEntity[] {
    const utilizedentities: UtilizedEntity[] = [];
    let append_name = "";
    if (alias !== "") {
        append_name = alias + ".";
    }
    else 
    {
        append_name = path.basename(exportfilepath).replace(".py", ".");
    }

    for (const [fileName, data] of Object.entries(fileData)) {
        if (fileName !== exportfilepath) {
            continue;
        }
        if (data.error) {
            utilizedentities.push({
                name: fileName,
                type: 'error',
                source: 'Exporting'
            });
        }

        if (data.function_names) {
            for (const functionName of data.function_names) {
                const functionArray = functionName.split('.');
                if (functionArray.length > 1) {
                    continue;
                }
                utilizedentities.push({
                    name: append_name + functionName,
                    type: 'function',
                    source: 'Exporting'
                });
            }
        }
        if (data.class_details) {
            for (const classDetail of data.class_details) {
                utilizedentities.push({
                    name: append_name + classDetail[Object.keys(classDetail)[0]] as string,
                    type: 'class',
                    source: 'Exporting'
                });
            }
        }

        if (data.global_variables) {
            for (const globalVariable of data.global_variables) {
                utilizedentities.push({
                    name: append_name + globalVariable.variable_name,
                    type: 'variable',
                    source: 'Exporting'
                });
            }
        }
    }

    return utilizedentities;
}
function findDependentNodeByName(dependencies: Set<DependentNode>, name: string): DependentNode | undefined {
    for (const node of dependencies) {
        if (node.name === name) {
            return node;
        }
    }
    return undefined;
}

function buildDependencyGraph(
    fileData: { [key: string]: CodeResponse },
    folderStructureData: { [key: string]: FolderStructure },
    workspaceFolders: string[]
): { [key: string]: Map<string, FileNode> } {
    const graph: { [key: string]: Map<string, FileNode> } = {};
    console.log("Building dependency graph......")

    function separate_files(workspaceFolder: string, fileData: { [key: string]: CodeResponse }) {
        const files: { [key: string]: CodeResponse } = {};
        for (const [filePath, data] of Object.entries(fileData)) {
            if (filePath.includes(workspaceFolder)) {
                files[filePath] = data;
            }
        }
        return files;
    }

    for (const folder of workspaceFolders) {
        const files = separate_files(folder, fileData);
        const folderStructure = folderStructureData[folder];
        const folderGraph = new Map<string, FileNode>();
        for (const [filePath, data] of Object.entries(files)) {
            folderGraph.set(filePath, { name: filePath, dependencies: new Set() } as FileNode);
        }
        for (const [filePath, data] of Object.entries(files)) {
            let pathArray = filePath.replace(folder, '').split('\\');
            pathArray.shift();
            pathArray.pop();
            if (pathArray === undefined) {
                continue;
            }
            if (data.imports && data.imports.from.length > 0) {
                for (const fromImport of data.imports.from) {
                    const modulePath = fromImport.module ? fromImport.module : "";
                    const name = fromImport.name ? fromImport.name : "";
                    const alias = fromImport.alias ? fromImport.alias : "";
                    const importfilepath = getFilePath_From(folder, name, modulePath, folderStructure, pathArray);
                    if (importfilepath === undefined) {
                        continue;
                    }
                    if (folderGraph.get(filePath) === undefined) {
                        folderGraph.set(filePath, { name: filePath, dependencies: new Set() } as FileNode);
                    }
                    const dependentNode: DependentNode = { name: importfilepath, valid: true, weight: [] as UtilizedEntity[] };
                    const importdepentNode: DependentNode = { name: filePath, valid: true, weight: [] as UtilizedEntity[] };
                    const importFilepathArray = importfilepath.replace(folder, '').split('\\');
                    const importFileData = files[importfilepath];
                    if (folderGraph.get(importfilepath) === undefined && importFileData) {
                        folderGraph.set(importfilepath, { name: importfilepath, dependencies: new Set() } as FileNode);
                    }
                    if (importFilepathArray[-1] === name + '.py' && importFileData) {
                        dependentNode.alias = alias;
                        importdepentNode.alias = alias;
                        dependentNode.weight = importEverything(importfilepath, files, alias);
                        importdepentNode.weight = exportEverything(importfilepath, files, alias);
                        const existingDependentNode = findDependentNodeByName(folderGraph.get(filePath)?.dependencies ?? new Set(), importfilepath);
                        const existingImportDependentNode = findDependentNodeByName(folderGraph.get(importfilepath)?.dependencies ?? new Set(), filePath);
                        if (existingDependentNode) {
                            folderGraph.get(filePath)?.dependencies.forEach((node) => {
                                if (node.name === importfilepath) {
                                    node.weight = dependentNode.weight;
                                }
                            });
                        } else {
                            folderGraph.get(filePath)?.dependencies.add(dependentNode);
                        }
                        if (existingImportDependentNode) {
                            folderGraph.get(importfilepath)?.dependencies.forEach((node) => {
                                if (node.name === filePath) {
                                    node.weight = importdepentNode.weight;
                                }
                            });
                        } else {
                            folderGraph.get(importfilepath)?.dependencies.add(importdepentNode);
                        }
                    }
                    else if (importFileData) {
                        let type = "";
                        if (importFileData.error) {
                            type = 'error';
                        }
                        if (importFileData.function_names) {
                            for (const functionName of importFileData.function_names) {
                                if (functionName === name) {
                                    type = 'function';
                                    break;
                                }
                            }
                        }
                        if (importFileData.class_details) {
                            for (const classDetail of importFileData.class_details) {
                                if (classDetail[Object.keys(classDetail)[0]] === name) {
                                    type = 'class';
                                    break;
                                }
                            }
                        }
                        if (importFileData.global_variables) {
                            for (const globalVariable of importFileData.global_variables) {
                                if (globalVariable.variable_name === name) {
                                    type = 'variable';
                                    break;
                                }
                            }
                        }
                        const importutilizedentities: UtilizedEntity = { name: name, type: type, alias: alias, source: 'Importing' };
                        const exportutilizedentities: UtilizedEntity = { name: name, type: type, alias: alias, source: 'Exporting' };
                        const existingDependentNode = findDependentNodeByName(folderGraph.get(filePath)?.dependencies ?? new Set(), importfilepath);
                        const existingImportDependentNode = findDependentNodeByName(folderGraph.get(importfilepath)?.dependencies ?? new Set(), filePath);
                        if (existingDependentNode) {
                            folderGraph.get(filePath)?.dependencies.forEach((node) => {
                                if (node.name === importfilepath) {
                                    node.weight.push(importutilizedentities);
                                }
                            });
                        } else {
                            dependentNode.weight.push(importutilizedentities);
                            folderGraph.get(filePath)?.dependencies.add(dependentNode);
                        }

                        if (existingImportDependentNode) {
                            folderGraph.get(importfilepath)?.dependencies.forEach((node) => {
                                if (node.name === filePath) {
                                    node.weight.push(exportutilizedentities);
                                }
                            });
                        } else {
                            importdepentNode.weight.push(exportutilizedentities);
                            folderGraph.get(importfilepath)?.dependencies.add(importdepentNode);
                        }
                    }
                    else
                    {
                        dependentNode.valid = false;
                        const importUtilizedEntity: UtilizedEntity = { name: name, type: 'no_file', alias: alias, source: 'Importing' };
                        const existingDependentNode = findDependentNodeByName(folderGraph.get(filePath)?.dependencies ?? new Set(), importfilepath);
                        if (existingDependentNode) {
                            folderGraph.get(filePath)?.dependencies.forEach((node) => {
                                if (node.name === importfilepath) {
                                    node.weight.push(importUtilizedEntity);
                                }
                            });
                        } else {
                            dependentNode.weight.push(importUtilizedEntity);
                            folderGraph.get(filePath)?.dependencies.add(dependentNode);
                        }
                    }
                }
            }
            if (data.imports && data.imports.imports.length > 0) {
                for (const impImport of data.imports.imports) {
                    const name = impImport.name ? impImport.name : "";
                    const alias = impImport.alias ? impImport.alias : "";
                    const importfilepath = getFilePath_Import(folder, name, folderStructure, pathArray);
                    if (importfilepath === undefined) {
                        continue;
                    }
                    if (folderGraph.get(filePath) === undefined) {
                        folderGraph.set(filePath, { name: filePath, dependencies: new Set() } as FileNode);
                    }
                    const importFileData = files[importfilepath];
                    if (folderGraph.get(importfilepath) === undefined && importFileData) {
                        folderGraph.set(importfilepath, { name: importfilepath, dependencies: new Set() } as FileNode);
                    }
                    const dependentNode: DependentNode = { name: importfilepath, alias: alias ,valid: true, weight: [] as UtilizedEntity[] };
                    const importdepentNode: DependentNode = { name: filePath, alias: alias,valid: true, weight: [] as UtilizedEntity[] };
                    if (importFileData)
                    {
                        dependentNode.weight = importEverything(importfilepath, files, alias);
                        importdepentNode.weight = exportEverything(importfilepath, files, alias);
                        const existingDependentNode = findDependentNodeByName(folderGraph.get(filePath)?.dependencies ?? new Set(), importfilepath);
                        const existingImportDependentNode = findDependentNodeByName(folderGraph.get(importfilepath)?.dependencies ?? new Set(), filePath);
                        if (existingDependentNode) {
                            folderGraph.get(filePath)?.dependencies.forEach((node) => {
                                if (node.name === importfilepath) {
                                    node.weight = dependentNode.weight;
                                }
                            });
                        } else {
                            folderGraph.get(filePath)?.dependencies.add(dependentNode);
                        }
                        if (existingImportDependentNode) {
                            folderGraph.get(importfilepath)?.dependencies.forEach((node) => {
                                if (node.name === filePath) {
                                    node.weight = importdepentNode.weight;
                                }
                            });
                        } else {
                            folderGraph.get(importfilepath)?.dependencies.add(importdepentNode);
                        }
                    }
                    else
                    {
                        dependentNode.valid = false;
                        const importUtilizedEntity: UtilizedEntity = { name: name, type: 'no_file', alias: alias, source: 'Importing' };
                        const existingDependentNode = findDependentNodeByName(folderGraph.get(filePath)?.dependencies ?? new Set(), importfilepath);
                        if (existingDependentNode) {
                            folderGraph.get(filePath)?.dependencies.forEach((node) => {
                                if (node.name === importfilepath) {
                                    node.weight.push(importUtilizedEntity);
                                }
                            });
                        } else {
                            dependentNode.weight.push(importUtilizedEntity);
                            folderGraph.get(filePath)?.dependencies.add(dependentNode);
                        }
                    }
                }
            }
        }
        graph[folder] = folderGraph;
    }
    const root= vscode.workspace.workspaceFolders?.[0].uri.fsPath || "";
    dependencyGraphLog(path.basename(root), graph);
    return graph;
}



export { buildDependencyGraph };