import { CodeResponse } from "../../types/api";


function taskDataGenerator(fileData: { [key: string]: CodeResponse }, taskType: string, taskJob: string) {
    const taskData: { [key: string]: string } = {};

    if (taskType === "detection") {
        const isValidData = (data: CodeResponse) => {
            if (!data.success || !data.code) { return false; }
            if (taskJob === "functions") {
                return (data.function_names ?? []).length > 0 || (data.class_details ?? []).length > 0;
            } else if (taskJob === "classes") {
                return (data.class_details ?? []).length > 0;
            }
            return false;
        };

        for (const [fileName, data] of Object.entries(fileData)) {
            if (isValidData(data)) {
                if (data.code) {
                    taskData[fileName] = data.code;
                }
            }
        }
    }

    return taskData;
}

export { taskDataGenerator };