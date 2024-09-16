import { FileNode, UtilizedEntity, DependentNode } from "../../../types/graph";
import { FolderStructure } from "../../../types/folder";
import { CodeResponse } from "../../../types/api";
import { getFilePath_From } from "./import_handler";

function buildDependencyGraph(
    fileData: { [key: string]: CodeResponse },
    folderStructureData: { [key: string]: FolderStructure },
    workspaceFolders: string[]
  ): { [key: string]: Map<string, FileNode> } | undefined {
    const graph: { [key: string]: Map<string, FileNode> } = {};
    
    function separate_files(workspaceFolder: string , fileData: { [key: string]: CodeResponse }) {
        const files: { [key: string]: CodeResponse } = {};
        for (const [filePath, data] of Object.entries(fileData)) {
            if (filePath.includes(workspaceFolder)) {
                files[filePath] = data;
            }
        }
        return files;
    }

    for (const folder of workspaceFolders) {
        const files = separate_files(folder, fileData);
        const folderStructure = folderStructureData[folder];
        const folderGraph = new Map<string, FileNode>();
        console.log("Files", files);
        for (const [filePath, data] of Object.entries(files)) {
            let pathArray = filePath.replace(folder, '').split('\\');
            pathArray.shift();
            pathArray.pop();
            if (pathArray === undefined) {
                continue;
            }
            if (data.imports && data.imports.from.length > 0) {
                console.log("File", filePath);
                const allimportsfiles: { [key: string]: CodeResponse } = {};
                for (const fromImport of data.imports.from) {
                    const modulePath = fromImport.module? fromImport.module : "";
                    const name = fromImport.name? fromImport.name : "";
                    const importfilepath = getFilePath_From(folder, name, modulePath, folderStructure, pathArray);
                    if (importfilepath === undefined) {
                        continue;
                    }
                    allimportsfiles[importfilepath] = fileData[importfilepath];
                    // const fileNode = folderGraph.get(filepath);
                    // if (fileNode === undefined) {
                    //     continue;
                    // }
                }
                console.log("All imports files", allimportsfiles);
            }
        }
        graph[folder] = folderGraph;
    }

    return undefined;
}
  


export { buildDependencyGraph };