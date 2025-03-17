import { sendFileForComplexConditionalAnalysis } from "../../utils/api/overly_complex_api";
import { CodeResponse, DetectionResponse, ComplexConditionalResponse } from "../../types/api";

async function getComplexConditionalSmells(
    fileData: { [key: string]: CodeResponse },
    newFiles: { [key: string]: string },
    FileDetectionData: { [key: string]: DetectionResponse }
) {
    const ComplexConditionalData: { [key: string]: ComplexConditionalResponse } = {};
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
        const analysisPromise = sendFileForComplexConditionalAnalysis(filePath, data.code, ComplexConditionalData)
            .catch((error) => {
                console.log('Error in file:', filePath);
                FileDetectionData[filePath] = {
                    success: false,
                    error: error.message
                };
            });
        analysisPromises.push(analysisPromise);
        // await sendFileForComplexConditionalAnalysis(filePath, data.code, ComplexConditionalData);
    }

    await Promise.allSettled(analysisPromises);

    for (const [filePath, data] of Object.entries(ComplexConditionalData)) {
        if (!FileDetectionData[filePath]) {
            FileDetectionData[filePath] = { success: false, overly_complex_condition: { success: false, data: [] } };
        }
    
        if (!Array.isArray(FileDetectionData[filePath].overly_complex_condition)) {
            FileDetectionData[filePath].overly_complex_condition = { success: false, data: [] };
        }
    
        FileDetectionData[filePath].overly_complex_condition = data;
        if (data)
        {
            FileDetectionData[filePath].success = true;
        }
    }

    return FileDetectionData;
}

export { getComplexConditionalSmells };