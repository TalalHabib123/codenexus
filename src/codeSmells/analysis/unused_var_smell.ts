import { detectUnusedVars } from "../../utils/api/unused_var_api";
import { CodeResponse, DetectionResponse } from "../../types/api";



export const getUnusedVarSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }) => {
    const DetectionData: { [key: string]: any } = {};
    const analysisPromises = [];
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        const analysisPromise = detectUnusedVars(data, DetectionData, filePath)
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
            FileDetectionData[filePath] = { success: false, unused_variables: { success: false, data: [] } };
        }
        if (detectionData.data.success) {
            FileDetectionData[filePath].unused_variables = {
                    success: true,
                    data: detectionData.data
                };
        } else {
            FileDetectionData[filePath].unused_variables = {
                    success: false,
                    error: detectionData.data.error || 'Unknown error'
                };
        }
    }
};