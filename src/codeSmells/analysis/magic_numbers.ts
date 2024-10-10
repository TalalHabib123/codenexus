import { detectMagicNumbers } from "../../utils/api/magic_number_api";
import { CodeResponse, DetectionResponse } from "../../types/api";
import { DataTransfer } from "vscode";
import { Console } from "console";


export const getMagicNumberSmells = async (
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }) => {
    
    for (const [filePath, data] of Object.entries(newFiles)) {
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        
        let detectionData = await detectMagicNumbers(filePath, data, fileData, FileDetectionData);
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