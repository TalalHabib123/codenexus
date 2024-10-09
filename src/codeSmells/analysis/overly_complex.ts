import { sendFileForComplexConditionalAnalysis } from "../../utils/api/overly_complex_api";
import { CodeResponse, DetectionResponse, ComplexConditionalResponse } from "../../types/api";

async function getComplexConditionalSmells(
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    const ComplexConditionalData: { [key: string]: ComplexConditionalResponse } = {};
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
        await sendFileForComplexConditionalAnalysis(filePath, data.code, ComplexConditionalData);
    }

    for (const [filePath, data] of Object.entries(ComplexConditionalData)) {
        // Ensure that FileDetectionData[filePath] exists and has a dead_code array.
        if (!FileDetectionData[filePath]) {
            FileDetectionData[filePath] = { success: false, overly_complex_condition: { success: false, data: [] } };
        }
    
        // If dead_code is not initialized as an array, initialize it.
        if (!Array.isArray(FileDetectionData[filePath].overly_complex_condition)) {
            FileDetectionData[filePath].overly_complex_condition = { success: false, data: [] };
        }
    
        // Map the data to dead_code.
        FileDetectionData[filePath].overly_complex_condition = data;
        if (data)
        {
            FileDetectionData[filePath].success = true;
        }
    }

    return FileDetectionData;
}

export { getComplexConditionalSmells };