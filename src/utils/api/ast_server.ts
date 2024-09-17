import * as path from 'path';
import axios from 'axios';
import { CodeResponse } from '../../types/api';
import { BASE_URL } from './api';

async function sendFileToServer(filePath: string, content: string, fileData: { [key: string]: CodeResponse }) {
    try {
        const fileName = path.basename(filePath);
        const response = await axios.post<CodeResponse>(`${BASE_URL}/analyze-ast`, { code: content });
        const responseData = response.data;
        if (responseData.success) {
            console.log(`File ${fileName} sent successfully.`);
            fileData[filePath] = {
                ...responseData,
                code: content,
            };
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


export { sendFileToServer };