import { detectDuplicateCode } from "../../utils/api/duplicate_smells_api";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { Rules } from "../../types/rulesets";
import { shouldDetectFile } from "../../utils/workspace-update/ruleset_checks"; 

export const getDuplicateCodeSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules
) => {
    console.log("Running duplicate code detection with ruleset configuration:", rulesetsData);
    const DetectionData: { [key: string]: any } = {};
    const analysisPromises = [];
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!shouldDetectFile(filePath, rulesetsData, 'duplicated code')) {
            continue;
        }
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        const analysisPromise = detectDuplicateCode(data, DetectionData, filePath)
            .catch((error) => {
                console.log('Error in file:', filePath);
                FileDetectionData[filePath] = {
                    success: false,
                    error: error.message
                };
            });
        analysisPromises.push(analysisPromise);
        // await detectDuplicateCode(data, DetectionData, filePath);
    }

    await Promise.allSettled(analysisPromises);

    for (const [filePath, detectionData] of Object.entries(DetectionData)) {
        if(!FileDetectionData[filePath]){
            FileDetectionData[filePath] = { success: false, duplicated_code: { success: false, data: [] } };
        }
        if (detectionData.data.success) {
            FileDetectionData[filePath].duplicated_code = {
                    success: true,
                    data: detectionData.data
                };
        } else {
            FileDetectionData[filePath].duplicated_code = {
                    success: false,
                    error: detectionData.data.error || 'Unknown error'
                };
        }
    }
};