import { FileNode } from "../../types/graph";
import { CodeResponse, DeadCodeResponse } from "../../types/api";
import { sendFileForDeadCodeAnalysis } from "../../utils/api/dead_code_api";

async function getDeadCodeSmells(
    dependencyGraph: { [key: string]: Map<string, FileNode> },
    fileData: { [key: string]: CodeResponse },
    DeadCodeData: { [key: string]: DeadCodeResponse }
) {
    for (const [filePath, data] of Object.entries(fileData)) {
        if (data.error || !data.code || data.code === "") {
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
    return DeadCodeData;
} 

export { getDeadCodeSmells };