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

    for(const [filePath, data] of Object.entries(ComplexConditionalData)) {
        FileDetectionData[filePath].overly_complex_condition = data;
    }
    return FileDetectionData;
}

export { getComplexConditionalSmells };