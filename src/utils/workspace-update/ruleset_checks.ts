import * as path from 'path';
import { Rules } from '../../types/rulesets';


export const shouldDetectFile = (filePath: string, rulesetsData: Rules, codeSmell: string) => {
    if (Array.isArray(rulesetsData.excludeFiles) && rulesetsData.excludeFiles.length === 0) {
        console.log(
            "No files to exclude"
        )
        return true;
    }

    

    if (Array.isArray(rulesetsData.excludeFiles))
    {
        for (const excludeFile of rulesetsData.excludeFiles) {
            console.log("-000000000000000000000000000000000");
            console.log(path.basename(filePath));
            if (typeof excludeFile === "object") console.log(excludeFile.path === path.basename(filePath));
            console.log(excludeFile);
            console.log(codeSmell);
            if (typeof excludeFile === 'string' && path.basename(filePath) === excludeFile) {
                return false;
            }
            if (typeof excludeFile === 'object' && excludeFile.path===filePath && excludeFile.smells.includes(codeSmell)) {
                return false;
            }
            if (typeof excludeFile === 'object' && excludeFile.path===filePath && excludeFile.smells.includes('*')) {
                return false;
            }
            if (typeof excludeFile === 'object' && excludeFile.path===filePath && excludeFile.smells.length === 0) {
                return true;
            }
        }
    }
    return true;
};


