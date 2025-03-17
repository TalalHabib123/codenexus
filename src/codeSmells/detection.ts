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
import { Rules } from '../types/rulesets';
import * as path from 'path';




export async function detectCodeSmells(dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[],
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules
) {
    console.log(rulesetsData);
    try {
        
        const detect = [
            getDeadCodeSmells(dependencyGraph, fileData, workspaceFolders, newFiles, FileDetectionData, rulesetsData),
            getUnreachableCodeSmells(fileData, newFiles, FileDetectionData, rulesetsData),
            getTemporaryFieldSmells(fileData, newFiles, FileDetectionData, rulesetsData),
            getComplexConditionalSmells(fileData, newFiles, FileDetectionData, rulesetsData),
            getGlobalConflictSmells(fileData, newFiles, workspaceFolders, FileDetectionData, rulesetsData),
            getMagicNumberSmells(fileData, newFiles, FileDetectionData, rulesetsData),
            // getParameterListSmells(fileData, newFiles, FileDetectionData, rulesetsData),
            // getUnusedVarSmells(fileData, newFiles, FileDetectionData, rulesetsData),
            // getNamingConventionSmells(fileData, newFiles, FileDetectionData, rulesetsData),
            // getDuplicateCodeSmells(fileData, newFiles, FileDetectionData, rulesetsData)

        ];
        await Promise.all(detect);
        console.log(FileDetectionData);
    }
    catch(err){
        console.error('Error during detection:', err);
    }

}

