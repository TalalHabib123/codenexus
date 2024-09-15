interface UtilizedEntity {
    name: string;
    type: 'function' | 'class' | 'variable' | 'module';
    source: 'Exporting' | 'Importing';
};

interface DependentNode  {
    name: string;
    weight: Array<UtilizedEntity>;
}


interface FileNode {
    name: string;
    dependencies: Set<DependentNode>; 
}

export { FileNode, UtilizedEntity, DependentNode };