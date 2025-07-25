import * as path from 'path';
import axios from 'axios';
import { TemporaryVariableResponse } from '../../types/api';
import { BASE_URL } from './api';

async function sendFileForTemporaryFieldAnalysis(
    filePath: string, 
    content: string,
    fileData: { [key: string]: TemporaryVariableResponse }) {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<TemporaryVariableResponse>(`${BASE_URL}/detection/temporary-field`, { code: content });
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

export { sendFileForTemporaryFieldAnalysis };