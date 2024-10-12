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
export async function detectCodeSmells(dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {

    try {
        const detect = [
            getDeadCodeSmells(dependencyGraph, fileData, workspaceFolders, newFiles, FileDetectionData),
            getUnreachableCodeSmells(fileData, newFiles, FileDetectionData),
            getTemporaryFieldSmells(fileData, newFiles, FileDetectionData),
            getComplexConditionalSmells(fileData, newFiles, FileDetectionData),
            getGlobalConflictSmells(fileData, newFiles, workspaceFolders, FileDetectionData),
            getMagicNumberSmells(fileData, newFiles, FileDetectionData),
            getParameterListSmells(fileData, newFiles, FileDetectionData),
            getUnusedVarSmells(fileData, newFiles, FileDetectionData),
            getNamingConventionSmells(fileData, newFiles, FileDetectionData),
            getDuplicateCodeSmells(fileData, newFiles, FileDetectionData)

        ];
        await Promise.all(detect);
        console.log(FileDetectionData);
    }
    catch(err){
        console.error('Error during detection:', err);
    }

}
