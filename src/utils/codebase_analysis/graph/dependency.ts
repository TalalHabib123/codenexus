import { FileNode, UtilizedEntity, DependentNode } from "../../../types/graph";
import { FolderStructure } from "../../../types/folder";
import { CodeResponse } from "../../../types/api";


function buildDependencyGraph(
    fileData: { [key: string]: CodeResponse },
    folderStructureData: { [key: string]: FolderStructure },
    workspaceFolders: string[]
  ): { [key: string]: Map<string, FileNode> } {
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
        
        for (const [filePath, data] of Object.entries(files)) {
            const path = filePath.replace(folder, '').split('/').shift();
            if (path === undefined) {
                continue;
            }
        }
        graph[folder] = folderGraph;
    }

    return graph;
}
  


export { buildDependencyGraph };