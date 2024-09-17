import { FolderStructure } from "../../../types/folder";

function verifyPath(pathArray: string[], file: string | undefined, folderStructureData: FolderStructure): boolean {
    for (const path of pathArray) {
        if (folderStructureData.subfolders[path] === undefined) {
            return false;
        }
        folderStructureData = folderStructureData.subfolders[path];
    }
    if (file && !folderStructureData.files.includes(file + '.py')) {
        return false;
    }
    return true;
}

function getFilePath_Import(
    folder: string,
    name: string,
    folderStructureData: FolderStructure,
    pathArray: string[]
): string | undefined {
    const pathQueue: string[] = [];
    pathArray.pop();
    const nameArray = name.split('.');
    if (nameArray.length === 0) {
        return undefined;
    }
    if (nameArray[0] === '') {
        nameArray.shift();
    }
    if (nameArray.length === 0) {
        return undefined;
    }
    else if (nameArray.length === 1) {
        for (const file of folderStructureData.files) {
            if (file === (nameArray[0] + '.py')) {
                return folder + '\\' + nameArray[0] + '.py';
            }
        }
    }
    else {
        if (pathArray.length > 0) {
            let tempFolderStructure = folderStructureData;
            for (const path of pathArray) {
                tempFolderStructure = tempFolderStructure.subfolders[path];
            }
            for (const path of pathArray) {
                pathQueue.push(path);
            }
            for (const path of nameArray) {
                if (tempFolderStructure.subfolders[path] === undefined) {
                    if (tempFolderStructure.files.includes(path + '.py')) {
                        if (pathQueue.length > 0) {
                            return folder + '\\' + pathQueue.join('\\') + '\\' + path + '.py';
                        }
                        else {
                            return folder + '\\' + path + '.py';
                        }
                    }
                    else {
                        return undefined;
                    }
                }
                tempFolderStructure = tempFolderStructure.subfolders[path];
                pathQueue.push(path);
            }
        }
        else {
            for (const path of nameArray) {
                if (folderStructureData.subfolders[path] === undefined) {
                    if (folderStructureData.files.includes(path + '.py')) {
                        if (pathQueue.length > 0) {
                            return folder + '\\' + pathQueue.join('\\') + '\\' + path + '.py';
                        }
                        else {
                            return folder + '\\' + path + '.py';
                        }

                    }
                    else {
                        return undefined;
                    }
                }
                folderStructureData = folderStructureData.subfolders[path];
                pathQueue.push(path);
            }
        }
    }
    return undefined;
}

function getFilePath_From(
    folder: string,
    name: string,
    modulePath: string,
    folderStructureData: FolderStructure,
    pathArray: string[]
): string | undefined {
    const pathQueue: string[] = [];
    const modulePathArray = modulePath.split('.');
    if (modulePathArray.length === 0) {
        return undefined;
    }
    if (modulePathArray[0] === '') {
        modulePathArray.shift();
        if (modulePathArray.length === 0) {
            return undefined;
        }
        else if (modulePathArray.length === 1) {
            let tempFolderStructure = folderStructureData;
            for (const path of pathArray) {
                tempFolderStructure = tempFolderStructure.subfolders[path];
            }
            for (const file of tempFolderStructure.files) {
                if (file === (modulePathArray[0] + '.py')) {
                    return folder + '\\' + modulePathArray[0] + '.py';
                }
            }
            pathQueue.push(modulePathArray[0]);
            modulePathArray.shift();
            if (verifyPath(pathQueue, name, tempFolderStructure)) {
                pathQueue.push((name + '.py'));
                const filepath = folder + '\\' + pathQueue.join('\\');
                return filepath;
            }
            return undefined;
        }
    }
    const orginalLength = modulePathArray.length;
    if (modulePathArray.length > 0 && pathArray.length > 0) {
        let flag = false;
        for (const module of pathArray) {
            if (module === modulePathArray[0]) {
                flag = true;
                pathQueue.push(module);
                modulePathArray.shift();
            }
        }

        if (flag === true) {
            for (const module of pathArray) {
                if (module !== pathQueue[0]) {
                    pathQueue.unshift(module);
                }
                else {
                    break;
                }
            }
        }
    }

    if (modulePathArray.length === 0) {
        if (verifyPath(pathQueue, name, folderStructureData)) {
            pathQueue.push((name + '.py'));
            const filepath = folder + '\\' + pathQueue.join('\\');
            return filepath;
        }
        return undefined;
    }

    else if (modulePathArray.length === 1) {
        if (verifyPath(pathQueue, modulePathArray[0], folderStructureData)) {
            pathQueue.push((modulePathArray[0] + '.py'));
            const filepath = folder + '\\' + pathQueue.join('\\');
            return filepath;
        }
        return undefined;
    }

    else if (pathQueue.length > 0) {
        if (verifyPath(pathQueue, undefined, folderStructureData)) {
            let tempFolderStructure = folderStructureData;
            for (const path of pathQueue) {
                tempFolderStructure = tempFolderStructure.subfolders[path];
            }
            for (const path of modulePathArray) {
                if (tempFolderStructure.subfolders[path] === undefined) {
                    if (tempFolderStructure.files.includes(path + '.py')) {
                        if (pathQueue.length > 0) {
                            return folder + '\\' + pathQueue.join('\\') + '\\' + path + '.py';
                        }
                        else {
                            return folder + '\\' + path + '.py';
                        }
                    }
                    else {
                        return undefined;
                    }
                }
                tempFolderStructure = tempFolderStructure.subfolders[path];
                pathQueue.push(path);
            }

            if (tempFolderStructure.files.includes(name + '.py')) {
                if (pathQueue.length > 0) {
                    return folder + '\\' + pathQueue.join('\\') + '\\' + name + '.py';
                }
                else {
                    return folder + '\\' + name + '.py';
                }
            }
            return undefined;

        }
        return undefined;
    }

    if (orginalLength === modulePathArray.length) {
        let tempFolderStructure = folderStructureData;
        for (const path of pathArray) {
            tempFolderStructure = tempFolderStructure.subfolders[path];
        }
        for (const path of pathArray) {
            pathQueue.push(path);
        }
        for (const path of modulePathArray) {
            if (tempFolderStructure.subfolders[path] === undefined) {
                if (tempFolderStructure.files.includes(path + '.py')) {
                    if (pathQueue.length > 0) {
                        return folder + '\\' + pathQueue.join('\\') + '\\' + path + '.py';
                    }
                    else {
                        return folder + '\\' + path + '.py';
                    }
                }
                else {
                    return undefined;
                }
            }
            tempFolderStructure = tempFolderStructure.subfolders[path];
            pathQueue.push(path);
        }
        if (tempFolderStructure.files.includes(name + '.py')) {
            if (pathQueue.length > 0) {
                return folder + '\\' + pathQueue.join('\\') + '\\' + name + '.py';
            }
            else {
                return folder + '\\' + name + '.py';
            }
        }
    }
    return undefined;
}


export { getFilePath_From, getFilePath_Import };