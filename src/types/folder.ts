interface FolderStructure {
    files: string[];
    subfolders: { [key: string]: FolderStructure };
}

export { FolderStructure };