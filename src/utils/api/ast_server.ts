import * as path from 'path';
import axios from 'axios';
import { CodeResponse, Response, DetectionResponse } from '../../types/api';
import { BASE_URL } from './api';
import { addDiagnostic } from '../ui/problemsTab';
import { log } from 'console';

// Generic error handler for failed requests
const handleRequestError = (filePath: string, content: string, error: any, fileData: { [key: string]: CodeResponse }) => {
    console.error(`Failed to send file ${path.basename(filePath)}:`, error);
    fileData[filePath] = {
        code: content,
        success: false,
        error: `Failed to communicate with server: ${error.message || error}`,
    };
};

// Function to send a file and handle the server response
async function sendFileToServer(filePath: string, content: string, fileData: { [key: string]: CodeResponse }) {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<CodeResponse>(`${BASE_URL}/detection/analyze-ast`, { code: content });
        const responseData = response.data;
        if (responseData.success) {
            console.log(`File ${fileName} sent successfully.`);
            fileData[filePath] = responseData;
            fileData[filePath].code = content;
        } else {
            console.error(`Error in file ${fileName}: ${responseData.error}`);
            fileData[filePath] = {
                code: content,
                success: false,
                error: responseData.error || "Unknown error",
            };
        }
    } catch (e) {
        console.error(`Failed to send file ${filePath}:`, e);
        fileData[filePath] = {
            code: content,
            success: false,
            error: "Failed to communicate with server" + e,
        };
    }
}

// Unified response handler
// const responseHandler = async (
//     responseData: Response,
//     fileData: { [key: string]: CodeResponse },
//     filePath: string,
//     content: string,
//     fileName: string,
//     detectionData: { [key: string]: DetectionResponse }
// ) => {
//     if (responseData['success']) {
//         return responseData;
        
//     } else {
//         console.error(`Error in file ${fileName}: ${responseData.error}`);
//         fileData[filePath] = {
//             code: content,
//             success: false,
//             error: responseData.error || 'Unknown error',
//         };
//     }
// };

// const detection_api = async (filePath: string, content: string,
//     fileData: { [key: string]: CodeResponse },
//     detectionData: { [key: string]: DetectionResponse }) => {
//     try {
//         const detectionTasks = [
//             // detectMagicNumbers(filePath, content, fileData, detectionData),
//             // detectDuplicateCode(filePath, content, fileData, detectionData),
//             // detectUnusedVariables(filePath, content, fileData, detectionData),
//             // detectLongParameterList(filePath, content, fileData, detectionData),
//             detectNamingConventions(filePath, content, fileData, detectionData),
//         ];

//         Promise.all(detectionTasks);
//     } catch (error) {
//         console.error('Error during detection:', error);
//     }
// };

// Detection function templates


// const detectDuplicateCode = async (filePath: string, content: string,
//     fileData: { [key: string]: CodeResponse },
//     detectionData: { [key: string]: DetectionResponse }) => {
//     await postToServer(filePath, content, fileData, '/detection/duplicated-code', detectionData);
// };



// const detectionResponseHandler = async (
//     responseData: Response,
//     filePath: string,
//     fileName: string,
//     endpoint: string,
//     detectionData: { [key: string]: DetectionResponse }
// ) => {
//     console.log(responseData);
//     if (responseData.success) {
//         console.log(`File ${fileName} sent successfully.`);
//         detectionData[filePath] = { ...responseData };
//     } else {
//         console.error(`Error in file ${fileName}: ${responseData.error}`);
//         detectionData[filePath] = {
//             success: false,
//             error: responseData.error || 'Unknown error',
//         };
//     }
// };

// const postToServer = async (
//     filePath: string,
//     content: string,
//     fileData: { [key: string]: CodeResponse },
//     endpoint: string,
//     detectionData: { [key: string]: DetectionResponse }
// ) => {
//     try {
//         const fileName = path.basename(filePath);
//         const response = await axios.post<Response>(`${BASE_URL}${endpoint}`, { code: content });
//         return await responseHandler(response.data, fileData, filePath, content, fileName, detectionData);
//         // await detectionResponseHandler(response.data, filePath, fileName, endpoint, detectionData);
//     } catch (e) {
//         handleRequestError(filePath, content, e, fileData);
//     }
// };


// const logDetectionData = (filePath: string, responseData: Response, detectionData: {[key: string]: DetectionResponse}) => {
//     if (!detectionData[filePath]) {
//         detectionData[filePath] = { success: false, dead_code: { success: false, data: [] } };
//     }

//     if (!Array.isArray(detectionData[filePath].dead_code)) {
//         detectionData[filePath].dead_code = { success: false, data: [] };
//     }

//     detectionData[filePath].dead_code = data;
//     if (data)
//     {
//         detectionData[filePath].success = true;
//     }
//     return detectionData;
// };



export { sendFileToServer };
