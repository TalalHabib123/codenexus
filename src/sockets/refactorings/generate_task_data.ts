import { CodeResponse } from "../../types/api";
import * as fs from 'fs';
import * as path from 'path';


function taskDataGenerator(fileData: { [key: string]: CodeResponse }, Type: string, file: string, additonalData: any = null) {
    const taskData: { [key: string]: string } = {};
    const filePath = path.resolve(file);
    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        taskData["code_snippet"] = code;
        taskData["file_path"] = file;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
    }
    if (Type === "name") {
        taskData["name"] = additonalData;
    }

    return taskData;
}

export { taskDataGenerator };