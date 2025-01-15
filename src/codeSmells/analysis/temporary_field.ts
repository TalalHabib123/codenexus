import { sendFileForTemporaryFieldAnalysis } from "../../utils/api/temporary_field_api";
import { CodeResponse, DetectionResponse, TemporaryVariableResponse } from "../../types/api";

async function getTemporaryFieldSmells(
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    const TemporaryFieldData: { [key: string]: TemporaryVariableResponse } = {};
    const analysisPromises = [];
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
            const analysisPromise = sendFileForTemporaryFieldAnalysis(filePath, data.code, TemporaryFieldData)
                .catch((error) => {
                    console.log('Error in file:', filePath);
                    FileDetectionData[filePath] = {
                        success: false,
                        error: error.message
                    };
                });
            analysisPromises.push(analysisPromise);
            // await sendFileForTemporaryFieldAnalysis(filePath, data.code, TemporaryFieldData);
        }
    }

    await Promise.allSettled(analysisPromises);

    for (const [filePath, data] of Object.entries(TemporaryFieldData)) {
        if (!FileDetectionData[filePath]) {
            FileDetectionData[filePath] = { success: false, temporary_field: { success: false, data: [] } };
        }
    
        if (!Array.isArray(FileDetectionData[filePath].temporary_field)) {
            FileDetectionData[filePath].temporary_field = { success: false, data: [] };
        }
    
        FileDetectionData[filePath].temporary_field = data;
        if (data)
        {
            FileDetectionData[filePath].success = true;
        }
    }
    return FileDetectionData;
}

export { getTemporaryFieldSmells };