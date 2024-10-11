import { detectLongParameterList } from "../../utils/api/long_parameter_list_api";
import { CodeResponse, DetectionResponse } from "../../types/api";

export const getParameterListSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }) => {
    
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        
        let detectionData = await detectLongParameterList(data);
        console.log("detectionData:", detectionData);
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