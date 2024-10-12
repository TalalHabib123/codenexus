import { detectDuplicateCode } from "../../utils/api/duplicate_smells_api";
import { CodeResponse, DetectionResponse } from "../../types/api";

export const getDuplicateCodeSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }) => {
    
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        
        let detectionData = await detectDuplicateCode(data);
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