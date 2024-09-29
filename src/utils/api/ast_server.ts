import * as path from 'path'; 
import axios from 'axios';
import { CodeResponse, Response } from '../../types/api';
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

const detection_api = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    try {
        const detectionTasks = [
            detectMagicNumbers(filePath, content, fileData), //DONE
            detectDuplicateCode(filePath, content, fileData),
            detectUnusedVariables(filePath, content, fileData),
            detectLongParameterList(filePath, content, fileData), //DONE
            // detectNamingConventions(filePath, content, fileData),
        ];

        Promise.all(detectionTasks);
    } catch (error) {
        console.error('Error during detection:', error);
    }
};

// Detection function templates
const detectMagicNumbers = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/magic-numbers');
    addDiagnostic('Uh Oh! Magic Numbers detected', filePath);
};

const detectDuplicateCode = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/duplicated-code');
    addDiagnostic('Uh Oh! Duplicate Code detected', filePath);
};

const detectUnusedVariables = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    await postToServer(filePath, content, fileData, '/unused-variables');
    addDiagnostic('Uh Oh! Unused Variables detected', filePath);
};

const detectLongParameterList = async (filePath: string, content: string, fileData: { [key: string]: CodeResponse }) => {
    let longParams = await postToServer(filePath, content, fileData, '/parameter-list');
    console.log("long params:" , longParams);
    Object.entries(longParams).map(([func, val]) => {
        if (val){
            addDiagnostic(`Uh Oh! Function ${func} has a long parameter list`, filePath);
        }
    });
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
        console.log("RESPONSE" , response);
        return await responseHandler(response.data, fileData, filePath, content, fileName);
    } catch (e) {
        handleRequestError(filePath, content, e, fileData);
    }
};

export { sendFileToServer, detection_api };
