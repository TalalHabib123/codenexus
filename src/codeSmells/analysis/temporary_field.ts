import { sendFileForTemporaryFieldAnalysis } from "../../utils/api/temporary_field_api";
import { CodeResponse, DetectionResponse, TemporaryVariableResponse } from "../../types/api";

async function getTemporaryFieldSmells(
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    const TemporaryFieldData: { [key: string]: TemporaryVariableResponse } = {};
    for (const [filePath, data] of Object.entries(fileData)) {
        if (!Object.keys(newFiles).some((key) => key === filePath)) {
            continue;
        }
        if (data.error || !data.code || data.code === "") {
            console.log('Error in file:', filePath);    
            FileDetectionData[filePath] = {
                success: false,
                error: data.error
            };
            continue;
        }
        if (data.class_details && data.class_details.length > 0) {
            await sendFileForTemporaryFieldAnalysis(filePath, data.code, TemporaryFieldData);
        }
    }

    for (const [filePath, data] of Object.entries(TemporaryFieldData)) {
        // Ensure that FileDetectionData[filePath] exists and has a dead_code array.
        if (!FileDetectionData[filePath]) {
            FileDetectionData[filePath] = { success: false, temporary_field: { success: false, data: [] } };
        }
    
        // If dead_code is not initialized as an array, initialize it.
        if (!Array.isArray(FileDetectionData[filePath].temporary_field)) {
            FileDetectionData[filePath].temporary_field = { success: false, data: [] };
        }
    
        // Map the data to dead_code.
        FileDetectionData[filePath].temporary_field = data;
        if (data)
        {
            FileDetectionData[filePath].success = true;
        }
    }
    return FileDetectionData;
}

export { getTemporaryFieldSmells };