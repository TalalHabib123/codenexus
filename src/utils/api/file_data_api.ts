import axios from "axios";
import { CodeResponse } from "../../types/api";
import { ExpressResponseType } from "../../types/logs";
import { BASE_URL } from "./api";

export const saveFileData = async (title: string , fileData: { [key: string]: CodeResponse }) => {
    // Transform fileData to only include code and ast
    const transformedFileData: { [key: string]: { code?: string; ast?: string } } = {};
    
    Object.entries(fileData).forEach(([fileName, data]) => {
        transformedFileData[fileName] = {
            ...(data.code && { code: data.code }),
            ...(data.ast && { ast: data.ast })
        };
    });
    
    try {
        const response = await axios.post<ExpressResponseType>(
            `${BASE_URL}/logs/update_file_data`, 
            { 
                title: title,
                fileData: transformedFileData
            }
        );
        
        return response.data;
    } catch (error) {
        console.error("Error saving file data:", error);
        throw error;
    }
};