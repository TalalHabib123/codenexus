import { FileNode } from "../../types/graph";
import { CodeResponse, DeadCodeResponse, DeadClassResponse, DetectionResponse } from "../../types/api";
import { sendFileForDeadCodeAnalysis, getClassDeadSmells } from "../../utils/api/dead_code_api";

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
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    const DeadCodeData: { [key: string]: DeadCodeResponse } = {};
    for (const [filePath, data] of Object.entries(FileDetectionData)) {
        if (data.dead_code && data.dead_code.success) {
            DeadCodeData[filePath] = data.dead_code;
        }
    }
    for (const [filePath, data] of Object.entries(fileData)) {
        if (data.error || !data.code || data.code === "") {
            console.log('Error in file:', filePath);    
            DeadCodeData[filePath] = {
                success: false,
                error: data.error
            };
            continue;
        }
        const function_names = data.function_names || [];
        const global_variables = data.global_variables?.map(variable => variable.variable_name) || [];
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        await sendFileForDeadCodeAnalysis(filePath, data.code, function_names, global_variables, DeadCodeData);
    }
    for (const workspaceFolder of workspaceFolders) {
        const files = separate_files(workspaceFolder, fileData);
        const dependencyGraphForFolder = dependencyGraph[workspaceFolder];
        for (const [filePath, data] of Object.entries(files)) {
            if (DeadCodeData[filePath] && DeadCodeData[filePath].success) {
                const graph_data = dependencyGraphForFolder.get(filePath);
                const dead_code_data = DeadCodeData[filePath];
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
                                        if (dead_code_data.function_names && dead_code_data.function_names.includes(exports_name)) {
                                            const index = dead_code_data.function_names.indexOf(exports_name);
                                            dead_code_data.function_names.splice(index, 1);
                                            DeadCodeData[filePath] = dead_code_data;
                                        }
                                    }
                                    else if (type === "variable") {
                                        if (dead_code_data.global_variables && dead_code_data.global_variables.includes(exports_name)) {
                                            const index = dead_code_data.global_variables.indexOf(exports_name);
                                            dead_code_data.global_variables.splice(index, 1);
                                            DeadCodeData[filePath] = dead_code_data;
                                        }
                                    }
                                    else if (type === "class") {
                                        if (dead_code_data.class_details && dead_code_data.class_details.length > 0) {
                                            for (const class_detail of dead_code_data.class_details) {
                                                if (class_detail.class_name === exports_name) {
                                                    if (fileData[exporting_file] && fileData[exporting_file].code) {
                                                        const data : DeadClassResponse  = await getClassDeadSmells(fileData[exporting_file].code, exports_name);
                                                        if (data.success && data.class_details) {
                                                            const methods = data.class_details[0];
                                                            const variables = data.class_details[1];
                                                            class_detail.has_instance = true;
                                                            if (Array.isArray(methods) && methods.length > 0) {
                                                                if (Array.isArray(dead_code_data.class_details[1]) && dead_code_data.class_details[1].length > 0)
                                                                {
                                                                    for (const method of methods) {
                                                                        const method_name = method.method_name;
                                                                        const index = dead_code_data.class_details[1].indexOf(method_name);
                                                                        if (index > -1) {
                                                                            dead_code_data.class_details[1].splice(index, 1);
                                                                        }
                                                                    }
                                                                    DeadCodeData[filePath] = dead_code_data;
                                                                }
                                                            }

                                                            if (Array.isArray(variables) && variables.length > 0) {
                                                                if (Array.isArray(dead_code_data.class_details[2]) && dead_code_data.class_details[2].length > 0)
                                                                {
                                                                    for (const variable of variables) {
                                                                        const variable_name = variable.variable_name;
                                                                        const index = dead_code_data.class_details[2].indexOf(variable_name);
                                                                        if (index > -1) {
                                                                            dead_code_data.class_details[2].splice(index, 1);
                                                                        }
                                                                    }
                                                                    DeadCodeData[filePath] = dead_code_data;
                                                                }
                                                            }   

                                                        }
                                                    }
                                                    const index = dead_code_data.class_details.indexOf(class_detail);
                                                    dead_code_data.class_details[index] = class_detail;
                                                    DeadCodeData[filePath] = dead_code_data;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    for (const [filePath, data] of Object.entries(DeadCodeData)) {
        if (!FileDetectionData[filePath]) {
            FileDetectionData[filePath] = { success: false, dead_code: { success: false, data: [] } };
        }
    
        if (!Array.isArray(FileDetectionData[filePath].dead_code)) {
            FileDetectionData[filePath].dead_code = { success: false, data: [] };
        }
    
        FileDetectionData[filePath].dead_code = data;
        if (data)
        {
            FileDetectionData[filePath].success = true;
        }
    }
    return FileDetectionData;
}

export { getDeadCodeSmells };