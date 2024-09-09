import { FileNode } from "../../../types/graph";
import { CodeResponse } from "../../../types/api";

function buildDependencyGraph(fileData: { [key: string]: CodeResponse }): Map<string, FileNode> {
    const graph: Map<string, FileNode> = new Map();

    for (const [fileName, codeResponse] of Object.entries(fileData)) {
        const node: FileNode = {
            name: fileName,
            dependencies: new Set(),
        };

        if (codeResponse.imports) {
            for (const [moduleName, imports] of Object.entries(codeResponse.imports)) {
                imports.forEach(importItem => {
                    if (importItem.module) {
                        node.dependencies.add(importItem.module);
                    }
                });
            }
        }

        graph.set(fileName, node);
    }

    return graph;
}

function topologicalSort(graph: Map<string, FileNode>): string[] {
    const inDegree: Map<string, number> = new Map();
    const sortedFiles: string[] = [];

    graph.forEach(node => {
        inDegree.set(node.name, 0); 
    });

    graph.forEach(node => {
        node.dependencies.forEach(dependency => {
            if (inDegree.has(dependency)) {
                inDegree.set(dependency, (inDegree.get(dependency) || 0) + 1);
            }
        });
    });
    const queue: string[] = [];

    inDegree.forEach((degree, fileName) => {
        if (degree === 0) {
            queue.push(fileName);
        }
    });

    while (queue.length > 0) {
        const current = queue.shift()!;
        sortedFiles.push(current);

        const node = graph.get(current);
        if (node) {
            node.dependencies.forEach(dependency => {
                inDegree.set(dependency, (inDegree.get(dependency) || 0) - 1);

                if (inDegree.get(dependency) === 0) {
                    queue.push(dependency);
                }
            });
        }
    }
    if (sortedFiles.length !== graph.size) {
        throw new Error("Cyclic dependency detected");
    }

    return sortedFiles;
}

export { buildDependencyGraph, topologicalSort };