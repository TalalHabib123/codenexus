import * as path from 'path'; 
import axios from 'axios';
import { CodeResponse, Response } from '../../types/api';
import { BASE_URL } from './api';

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
        const response = await axios.post<Response>(`${BASE_URL}/analyze-ast`, { code: content });
        await responseHandler(response.data, fileData, filePath, content, fileName);
    } catch (e) {
        handleRequestError(filePath, content, e, fileData);
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
    if (responseData.success) {
        console.log(`File ${fileName} sent successfully.`);
        fileData[filePath] = { ...responseData, code: content };
    } else {
        console.error(`Error in file ${fileName}: ${responseData.error}`);
        fileData[filePath] = {
            code: content,
            success: false,
            error: responseData.error || 'Unknown error',
        };
    }
};

const detection_api = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    try {
      
        const detectionTasks = [
            detectMagicNumbers(filePath, content, fileData),
            detectDuplicateCode(filePath, content, fileData),
            detectUnusedVariables(filePath, content, fileData),
            detectLongParameterList(filePath, content, fileData),
            detectNamingConventions(filePath, content, fileData),
        ];

        Promise.all(detectionTasks);
    } catch (error) {
        console.error('Error during detection:', error);
    }
};

// Detection function templates
const detectMagicNumbers = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/magic-numbers');
};

const detectDuplicateCode = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/duplicated-code');
};

const detectUnusedVariables = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/unused-variables');
};

const detectLongParameterList = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/parameter-list');
};

const detectNamingConventions = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/naming-convention');
};

// Reusable server post function for all detection types
const postToServer = async (
    filePath: string,
    content: string,
    fileData: { [key: string]: CodeResponse },
    endpoint: string
) => {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<Response>(`${BASE_URL}${endpoint}`, { code: content });
        console.log("Response: ",response.data['data']);
        await responseHandler(response.data, fileData, filePath, content, fileName);
    } catch (e) {
        handleRequestError(filePath, content, e, fileData);
    }
};

export { sendFileToServer, detection_api };
