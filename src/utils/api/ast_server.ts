import * as path from 'path';
import axios from 'axios';
import { CodeResponse, Response, DetectionResponse } from '../../types/api';
import { BASE_URL } from './api';
import { addDiagnostic } from '../ui/problemsTab';

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
        const response = await axios.post<CodeResponse>(`${BASE_URL}/analyze-ast`, { code: content });
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
const responseHandler = async (
    responseData: Response,
    fileData: { [key: string]: CodeResponse },
    filePath: string,
    content: string,
    fileName: string
) => {
    console.log(responseData);
    console.log('response data:', responseData);
    if (responseData['success']) {
        console.log(`File ${fileName} sent successfully.`);
        return JSON.parse(responseData['data'] as string);
    } else {
        console.error(`Error in file ${fileName}: ${responseData.error}`);
        fileData[filePath] = {
            code: content,
            success: false,
            error: responseData.error || 'Unknown error',
        };
    }
};

const detection_api = async (filePath: string, content: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    try {
        const detectionTasks = [
            detectMagicNumbers(filePath, content, fileData, detectionData),
            detectDuplicateCode(filePath, content, fileData, detectionData),
            detectUnusedVariables(filePath, content, fileData, detectionData),
            detectLongParameterList(filePath, content, fileData, detectionData),
            detectNamingConventions(filePath, content, fileData, detectionData),
        ];

        Promise.all(detectionTasks);
    } catch (error) {
        console.error('Error during detection:', error);
    }
};

// Detection function templates
const detectMagicNumbers = async (filePath: string, content: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    await postToServer(filePath, content, fileData, '/magic-numbers', detectionData);
};

const detectDuplicateCode = async (filePath: string, content: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    await postToServer(filePath, content, fileData, '/duplicated-code', detectionData);
    addDiagnostic('Uh Oh! Duplicate Code detected', filePath);
};

const detectUnusedVariables = async (filePath: string, content: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    await postToServer(filePath, content, fileData, '/unused-variables', detectionData);
    addDiagnostic('Uh Oh! Unused Variables detected', filePath);
};

const detectLongParameterList = async (filePath: string, content: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    let longParams = await postToServer(filePath, content, fileData, '/parameter-list', detectionData);
    console.log("long params:", longParams);
    Object.entries(longParams).map(([func, val]) => {
        if (val) {
            addDiagnostic(`Uh Oh! Function ${func} has a long parameter list`, filePath);
        }
    });
};

const detectNamingConventions = async (filePath: string, content: string,
    fileData: { [key: string]: CodeResponse },
    detectionData: { [key: string]: DetectionResponse }) => {
    await postToServer(filePath, content, fileData, '/naming-convention', detectionData);

};

const detectionResponseHandler = async (
    responseData: Response,
    filePath: string,
    fileName: string,
    endpoint: string,
    detectionData: { [key: string]: DetectionResponse }
) => {
    console.log(responseData);
    if (responseData.success) {
        console.log(`File ${fileName} sent successfully.`);
        detectionData[filePath] = { ...responseData };
    } else {
        console.error(`Error in file ${fileName}: ${responseData.error}`);
        detectionData[filePath] = {
            success: false,
            error: responseData.error || 'Unknown error',
        };
    }
};

const postToServer = async (
    filePath: string,
    content: string,
    fileData: { [key: string]: CodeResponse },
    endpoint: string,
    detectionData: { [key: string]: DetectionResponse }
) => {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<Response>(`${BASE_URL}${endpoint}`, { code: content });
        return await responseHandler(response.data, fileData, filePath, content, fileName);
        // await detectionResponseHandler(response.data, filePath, fileName, endpoint, detectionData);
    } catch (e) {
        handleRequestError(filePath, content, e, fileData);
    }
};

export { sendFileToServer, detection_api };
