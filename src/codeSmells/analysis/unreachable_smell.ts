import { sendFileForUnreachableCodeAnalysis } from "../../utils/api/unreachable_code_api";
import { CodeResponse, DetectionResponse, UnreachableResponse } from "../../types/api";

async function getUnreachableCodeSmells(
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    const UnreachableCodeData: { [key: string]: UnreachableResponse } = {};
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
        await sendFileForUnreachableCodeAnalysis(filePath, data.code, UnreachableCodeData);
    }

    for (const [filePath, data] of Object.entries(UnreachableCodeData)) {
        // Ensure that FileDetectionData[filePath] exists and has a dead_code array.
        if (!FileDetectionData[filePath]) {
            FileDetectionData[filePath] = { success: false, unreachable_code: { success: false, data: [] } };
        }
    
        // If dead_code is not initialized as an array, initialize it.
        if (!Array.isArray(FileDetectionData[filePath].unreachable_code)) {
            FileDetectionData[filePath].unreachable_code = { success: false, data: [] };
        }
    
        // Map the data to dead_code.
        FileDetectionData[filePath].unreachable_code = data;
        if (data)
        {
            FileDetectionData[filePath].success = true;
        }
    }
    return FileDetectionData;
}

export { getUnreachableCodeSmells };