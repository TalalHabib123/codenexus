import { detectUnusedVars } from "../../utils/api/unused_var_api";
import { CodeResponse, DetectionResponse } from "../../types/api";



export const getUnusedVarSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }) => {
    
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        
        let detectionData = await detectUnusedVars(data);
        if (detectionData.data.success) {
            console.log("detectionData:", detectionData);
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