import { detectMagicNumbers } from "../../utils/api/magic_number_api";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { DataTransfer } from "vscode";
import { Console } from "console";
import { Rules } from "../../types/rulesets";
import { shouldDetectFile } from "../../utils/workspace-update/ruleset_checks";

export const getMagicNumberSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules
) => {
    
    const DetectionData: { [key: string]: any } = {};
    const analysisPromises = [];

    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!shouldDetectFile(filePath, rulesetsData, 'magic numbers')) {
            continue;
        }

        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        
        const analysisPromise = detectMagicNumbers(data, DetectionData, filePath)
            .catch((error) => {
                console.log('Error in file:', filePath);
                FileDetectionData[filePath] = {
                    success: false,
                    error: error.message
                };
            });
        analysisPromises.push(analysisPromise);
    }
    await Promise.allSettled(analysisPromises);

    for (const [filePath, detectionData] of Object.entries(DetectionData)) {
        if(!FileDetectionData[filePath]){
            FileDetectionData[filePath] = { success: false, magic_numbers: { success: false, data: [] } };
        }
        if (detectionData.data.success) {
            FileDetectionData[filePath].magic_numbers = {
                    success: true,
                    data: detectionData.data
                };
        } else {
            FileDetectionData[filePath].magic_numbers = {
                    success: false,
                    error: detectionData.data.error || 'Unknown error'
                };
        }
    }

};


// let detectionData = await detectMagicNumbers(filePath, data, fileData, FileDetectionData);
// if(!FileDetectionData[filePath]){
//     FileDetectionData[filePath] = { success: false, magic_numbers: { success: false, data: [] } };
// }
// if (detectionData.data.success) {
//     FileDetectionData[filePath].magic_numbers = {
//             success: true,
//             data: detectionData.data
//         };
// } else {
//     FileDetectionData[filePath].magic_numbers = {
//             success: false,
//             error: detectionData.data.error || 'Unknown error'
//         };
// }