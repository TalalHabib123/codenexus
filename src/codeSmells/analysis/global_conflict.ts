import { sendFileForGlobalConflictAnalysis } from "../../utils/api/global_conflict_api";
import { CodeResponse, DetectionResponse, VariableConflictResponse } from "../../types/api";

function separate_files(workspaceFolder: string, fileData: { [key: string]: CodeResponse }) {
    const files: { [key: string]: CodeResponse } = {};
    for (const [filePath, data] of Object.entries(fileData)) {
        if (filePath.includes(workspaceFolder)) {
            files[filePath] = data;
        }
    }
    return files;
}

async function getGlobalConflictSmells(
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    workspaceFolders: string[],
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    const GlobalConflictData: { [key: string]: VariableConflictResponse } = {};
    for (const folder of workspaceFolders) {
        const files = separate_files(folder, fileData);
        const all_files_global_variables_list: { [key: string]: string[] } = {};
        for (const [filePath, data] of Object.entries(files)) {
            if (!Object.keys(newFiles).some((key) => key === filePath)) {
                continue;
            }
            if (data.error || !data.code || data.code === "") {
                console.log('Error in file:', filePath);
                FileDetectionData[filePath] = {
                    success: false,
                    error: data.error
                };
                continue;
            }
            const global_variables_list = data.global_variables?.map(variable => variable.variable_name) || [];
            if (global_variables_list.length > 0) {
                all_files_global_variables_list[filePath] = global_variables_list;
                await sendFileForGlobalConflictAnalysis(filePath, data.code, global_variables_list, GlobalConflictData);
            }
        }
        for (const [filePath, global_variables_list] of Object.entries(all_files_global_variables_list)) {
            for (const [otherFilePath, otherGlobalVariablesList] of Object.entries(all_files_global_variables_list)) {
                if (filePath === otherFilePath) {
                    continue;
                }
                const common_variables = global_variables_list.filter(value => otherGlobalVariablesList.includes(value));
                if (common_variables.length > 0) {
                    for (const variable of common_variables) {
                        const conflict_warning = `Variable ${variable} is used in ${otherFilePath} files`;
                        if (GlobalConflictData[filePath] && GlobalConflictData[filePath].conflicts_report) {
                            const conflict_report = GlobalConflictData[filePath].conflicts_report.find(report => report.variable === variable);
                            const report_id = GlobalConflictData[filePath].conflicts_report.findIndex(report => report.variable === variable);
                            if (conflict_report) {
                                conflict_report.conflicts.push(conflict_warning);
                                GlobalConflictData[filePath].conflicts_report[report_id] = conflict_report;
                            } else {
                                GlobalConflictData[filePath].conflicts_report.push({
                                    variable: variable,
                                    conflicts: [...conflict_warning],
                                    assignments: [],
                                    local_assignments: [],
                                    usages: [],
                                    warnings: []
                                });
                            }
                        } else {
                            GlobalConflictData[filePath] = {
                                conflicts_report: [
                                    {
                                        variable: variable,
                                        conflicts: [...conflict_warning],
                                        assignments: [],
                                        local_assignments: [],
                                        usages: [],
                                        warnings: []
                                    }
                                ],
                                success: true
                            };
                        }
                    }
                }
            }
        }
    }
    console.log("Global Conflict Data:", GlobalConflictData);
    for (const [filePath, data] of Object.entries(GlobalConflictData)) {
        // Ensure that FileDetectionData[filePath] exists and has a dead_code array.
        if (!FileDetectionData[filePath]) {
            FileDetectionData[filePath] = { success: false, global_conflict: { success: false, data: [] } };
        }
    
        // If dead_code is not initialized as an array, initialize it.
        if (!Array.isArray(FileDetectionData[filePath].global_conflict)) {
            FileDetectionData[filePath].global_conflict = { success: false, data: [] };
        }
    
        // Map the data to dead_code.
        FileDetectionData[filePath].global_conflict = data;
        if (data)
        {
            FileDetectionData[filePath].success = true;
        }
    }

    return FileDetectionData;
}

export { getGlobalConflictSmells };