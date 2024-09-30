import { FileNode } from "../types/graph";
import { CodeResponse, DeadCodeResponse } from "../types/api";
import { getDeadCodeSmells } from "./analysis/dead_smells";

export async function detectCodeSmells(dependencyGraph: { [key: string]: Map<string, FileNode> }, 
    fileData: { [key: string]: CodeResponse },
    workspaceFolders: string[]) {
    const DeadCodeData: { [key: string]: DeadCodeResponse } = {};
    await getDeadCodeSmells(dependencyGraph, fileData, DeadCodeData, workspaceFolders);
    console.log(DeadCodeData);
}
