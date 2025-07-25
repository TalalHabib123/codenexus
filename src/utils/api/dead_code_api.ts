import * as path from 'path';
import axios from 'axios';
import { DeadCodeResponse ,DeadClassResponse } from '../../types/api';
import { BASE_URL } from './api';

async function sendFileForDeadCodeAnalysis(filePath: string, 
    content: string,
    function_names: string[],
    global_variables: string[], 
    fileData: { [key: string]: DeadCodeResponse }) {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<DeadCodeResponse>(`${BASE_URL}/detection/dead-code`, { code: content, function_names, global_variables });
        const responseData = response.data;
        if (responseData.success) {
            console.log(`File ${fileName} sent successfully.`);
            fileData[filePath] = {
                ...responseData
            };
        } else {
            console.error(`Error in file ${fileName}: ${responseData.error}`);
            fileData[filePath] = {
                success: false,
                error: responseData.error || "Unknown error",
            };
        }
    } catch (e) {
        console.error(`Failed to send file ${filePath}:`, e);
        fileData[filePath] = {
            success: false,
            error: "Failed to communicate with server" + e,
        };
    }
}

async function getClassDeadSmells(code: string, class_name: string) {
    try {
        const response = await axios.post<DeadClassResponse>(`${BASE_URL}/detection/dead-class`, { code, class_name });
        return response.data;
    } catch (e) {
        console.error(`Failed to get dead smells for class ${class_name}:`, e);
        return {
            success: false,
            error: "Failed to communicate with server" + e,
        };
    }
}

export { sendFileForDeadCodeAnalysis, getClassDeadSmells };