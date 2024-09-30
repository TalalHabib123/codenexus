import { FileNode } from "../../types/graph";
import { CodeResponse, DeadCodeResponse } from "../../types/api";
import { sendFileForDeadCodeAnalysis } from "../../utils/api/dead_code_api";

function separate_files(workspaceFolder: string, fileData: { [key: string]: CodeResponse }) {
    const files: { [key: string]: CodeResponse } = {};
    for (const [filePath, data] of Object.entries(fileData)) {
        if (filePath.includes(workspaceFolder)) {
            files[filePath] = data;
        }
    }
    return files;
}

async function getDeadCodeSmells(
    dependencyGraph: { [key: string]: Map<string, FileNode> },
    fileData: { [key: string]: CodeResponse },
    DeadCodeData: { [key: string]: DeadCodeResponse },
    workspaceFolders: string[]
) {
    for (const [filePath, data] of Object.entries(fileData)) {
        if (data.error || !data.code || data.code === "") {
            console.log(data);
            console.log('Error in file:', filePath);    
            DeadCodeData[filePath] = {
                success: false,
                error: data.error
            };
            continue;
        }
        const function_names = data.function_names || [];
        const global_variables = data.global_variables?.map(variable => variable.variable_name) || [];
        await sendFileForDeadCodeAnalysis(filePath, data.code, function_names, global_variables, DeadCodeData);
    }
    for (const workspaceFolder of workspaceFolders) {
        const files = separate_files(workspaceFolder, fileData);
        const dependencyGraphForFolder = dependencyGraph[workspaceFolder];
        for (const [filePath, data] of Object.entries(files)) {
            if (DeadCodeData[filePath] && DeadCodeData[filePath].success) {
                const graph_data = dependencyGraphForFolder.get(filePath);
                if (graph_data) {
                    for (const dependency of graph_data.dependencies) {
                        if (dependency.valid)
                        {
                            for(const weight of dependency.weight) {
                                if (weight.source === "Exporting")
                                {
                                    const exporting_file = dependency.name;
                                    let exports_name = weight.name;
                                    let alias = weight.alias;
                                    const type = weight.type;
                                    let call_flag = false;
                                    if (exports_name.includes('.')){
                                        exports_name = exports_name.split('.')[1];
                                        call_flag = true;
                                    }
                                    if (type === "function") {
                                        
                                    }
                                    else if (type === "variable") {

                                    }
                                    else if (type === "class") {

                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return DeadCodeData;
}

export { getDeadCodeSmells };