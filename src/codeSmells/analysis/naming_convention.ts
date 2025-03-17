import { detectNamingConvention } from "../../utils/api/naming_convention_api";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { Rules } from "../../types/rulesets";
import { shouldDetectFile } from "../../utils/workspace-update/ruleset_checks";

export const getNamingConventionSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules
) => {
    
    const DetectionData: { [key: string]: any } = {};
    const analysisPromises = [];
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!shouldDetectFile(filePath, rulesetsData, 'naming convention')) {
            continue;
        }
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        const analysisPromise = detectNamingConvention(data, DetectionData, filePath)
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
            FileDetectionData[filePath] = { success: false, naming_convention: { success: false, data: [] } };
        }
        if (detectionData.data.success) {
            FileDetectionData[filePath].naming_convention = {
                    success: true,
                    data: detectionData.data
                };
        } else {
            FileDetectionData[filePath].naming_convention = {
                    success: false,
                    error: detectionData.data.error || 'Unknown error'
                };
        }
    }
};


// let detectionData = await detectNamingConvention(data);
// if(!FileDetectionData[filePath]){
//     FileDetectionData[filePath] = { success: false, naming_convention: { success: false, data: [] } };
// }
// if (detectionData.data.success) {
//     FileDetectionData[filePath].naming_convention = {
//             success: true,
//             data: detectionData.data
//         };
// } else {
//     FileDetectionData[filePath].naming_convention = {
//             success: false,
//             error: detectionData.data.error || 'Unknown error'
//         };
// }