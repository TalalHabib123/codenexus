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

export async function detectCodeSmells(dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    await getDeadCodeSmells(dependencyGraph, fileData, workspaceFolders, newFiles, FileDetectionData);

    await getUnreachableCodeSmells(fileData, newFiles, FileDetectionData);

    await getTemporaryFieldSmells(fileData, newFiles, FileDetectionData);

    await getComplexConditionalSmells(fileData, newFiles, FileDetectionData);

    await getGlobalConflictSmells(fileData, newFiles, workspaceFolders, FileDetectionData);

    await getMagicNumberSmells(fileData, newFiles, FileDetectionData);

    await getParameterListSmells(fileData, newFiles, FileDetectionData);

    await getUnusedVarSmells(fileData, newFiles, FileDetectionData);

    console.log(FileDetectionData);
}
