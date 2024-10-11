import { detectNamingConvention } from "../../utils/api/naming_convention_api";
import { CodeResponse, DetectionResponse } from "../../types/api";

export const getNamingConventionSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }) => {
    
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        
        let detectionData = await detectNamingConvention(data);
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