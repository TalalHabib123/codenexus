import { detectLongParameterList } from "../../utils/api/long_parameter_list_api";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { Rules } from "../../types/rulesets";
import { shouldDetectFile } from "../../utils/workspace-update/ruleset_checks";

export const getParameterListSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse },
    rulesetsData: Rules
) => {

    const DetectionData: { [key: string]: any } = {};
    const analysisPromises = [];
    
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!shouldDetectFile(filePath, rulesetsData, 'long parameter list')) {
            continue;
        }

        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        
        const analysisPromise = detectLongParameterList(data, DetectionData, filePath)
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
            FileDetectionData[filePath] = { success: false, long_parameter_list: { success: false, data: [] } };
        }
        if (detectionData.data.success) {
            FileDetectionData[filePath].long_parameter_list = {
                    success: true,
                    data: detectionData.data
                };
        } else {
            FileDetectionData[filePath].long_parameter_list = {
                    success: false,
                    error: detectionData.data.error || 'Unknown error'
                };
        }
    }
};

// let detectionData = await detectLongParameterList(data);
// if(!FileDetectionData[filePath]){
//     FileDetectionData[filePath] = { success: false, long_parameter_list: { success: false, data: [] } };
// }
// if (detectionData.data.success) {
//     FileDetectionData[filePath].long_parameter_list = {
//             success: true,
//             data: detectionData.data
//         };
// } else {
//     FileDetectionData[filePath].long_parameter_list = {
//             success: false,
//             error: detectionData.data.error || 'Unknown error'
//         };
// }