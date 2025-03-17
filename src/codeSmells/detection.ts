import { FileNode } from "../types/graph";
import { CodeResponse, DeadCodeResponse, DetectionResponse } from "../types/api";
import { Rules } from "../types/rulesets";
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
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules
) {

    try {
        if (rulesetsData.detectSmells.includes("*"))
        {
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
            return;
        }
        let detect = [];
        if (rulesetsData.detectSmells.includes("dead code"))
        {
            detect.push(getDeadCodeSmells(dependencyGraph, fileData, workspaceFolders, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("unreachable code"))
        {
            detect.push(getUnreachableCodeSmells(fileData, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("temporary field"))
        {
            detect.push(getTemporaryFieldSmells(fileData, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("overly complex conditional statements"))
        {
            detect.push(getComplexConditionalSmells(fileData, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("global variables conflict"))
        {
            detect.push(getGlobalConflictSmells(fileData, newFiles, workspaceFolders, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("magic numbers"))
        {
            detect.push(getMagicNumberSmells(fileData, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("long parameter list"))
        {
            detect.push(getParameterListSmells(fileData, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("unused variables"))
        {
            detect.push(getUnusedVarSmells(fileData, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("naming convention"))
        {
            detect.push(getNamingConventionSmells(fileData, newFiles, FileDetectionData));
        }
        if (rulesetsData.detectSmells.includes("duplicated code"))
        {
            detect.push(getDuplicateCodeSmells(fileData, newFiles, FileDetectionData));
        }
        await Promise.all(detect);
        console.log(FileDetectionData);
    }
    catch(err){
        console.error('Error during detection:', err);
    }

}
