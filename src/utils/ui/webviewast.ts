import * as vscode from 'vscode';
import { WebviewPanel } from 'vscode';

function parseDependencyGraph(dependencyGraph: any): { nodes: any[]; edges: any[] } {
    const nodes: any[] = [];
    const edges: any[] = [];

    
    function processNode(filePath: string, fileData: any) {
        // Add the current file as a node if not already added
        if (!nodes.find((node) => node.id === filePath)) {
            nodes.push({ id: filePath, label: filePath });
        }

        // Process dependencies
        if (fileData.dependencies && fileData.dependencies.size > 0) {
            Array.from(fileData.dependencies).forEach((dependency: any) => {
                const dependencyName = dependency.name;
               console.log(dependencyName)
                // Filter dependencies based on weight.source === "Exporting"
                const validDependency = dependency.weight.every(
                    (weight: any) => weight.source === "Exporting"
                );
                if (!validDependency) return;

                // Add the dependency node if it doesn't exist
                if (!nodes.find((node) => node.id === dependencyName)) {
                    nodes.push({ id: dependencyName, label: dependencyName });
                }

                // Add an edge for the dependency relationship
                edges.push({
                    from: filePath,
                    to: dependencyName,
                    label: 'depends_on', // Add more specific labels if needed
                    arrows: 'to', // Indicate direction
                });

                // Recursively process the dependency node if it has its own dependencies
                if (dependency.dependencies) {
                    processNode(dependencyName, dependency);
                }
            });
        }

        // Process weights if available
        if (fileData.weight && Array.isArray(fileData.weight)) {
            fileData.weight.forEach((weight: any) => {
                const weightName = weight.name;

                // Add the weight node if it doesn't exist
                if (!nodes.find((node) => node.id === weightName)) {
                    nodes.push({ id: weightName, label: weightName });
                }

                // Add an edge for the weight relationship
                edges.push({
                    from: filePath,
                    to: weightName,
                    label: weight.type || 'uses', // Specify the type of relationship (e.g., 'variable', 'function')
                    arrows: 'to',
                });
            });
        }
    }

    // Traverse the dependency graph
    Object.keys(dependencyGraph).forEach((filePath) => {
        const fileData = dependencyGraph[filePath];
        processNode(filePath, fileData);
    });

    return { nodes, edges };
}

export function createWebviewPanel(context: vscode.ExtensionContext, dependencyGraph: any): WebviewPanel {
    // Convert the original dependency graph format into nodes and edges
    const { nodes, edges } = parseDependencyGraph(dependencyGraph);

    console.log("----------------------------------");
    nodes.forEach((node, index) => {
        console.log(`Node ${index}:`, node);
    });
    console.log("----------------------------------");
    edges.forEach((edge, index) => {
        console.log(`Edge ${index}:`, edge);
    });
    console.log("----------------------------------");

    // Create a Webview Panel
    const panel = vscode.window.createWebviewPanel(
        'dependencyGraph', // Internal ID
        'Dependency Graph', // Title
        vscode.ViewColumn.One, // Show in active editor
        {
            enableScripts: true, // Allow JS execution in Webview
        }
    );

    // Set the HTML Content
    panel.webview.html = getWebviewContent();

    // Send the processed graph data to the WebView
    panel.webview.postMessage({ nodes, edges });

    return panel;
}

export function getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dependency Graph</title>
        <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.css" />
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          #network {
            width: 100%;
            height: 100vh;
            border: 1px solid lightgray;
          }
        </style>
      </head>
      <body>
        <h1>Dependency Graph</h1>
        <div id="network"></div>
        <script>
          const vscode = acquireVsCodeApi();

          window.addEventListener('message', event => {
            const { nodes, edges } = event.data;
            renderGraph(nodes, edges);
          });

          function renderGraph(nodes, edges) {
              const container = document.getElementById('network');

              const data = {
                  nodes: new vis.DataSet(nodes),
                  edges: new vis.DataSet(edges)
              };

              const options = {
                  nodes: {
                      shape: 'box',
                      font: { size: 16 },
                      color: {
                          background: '#97C2FC',
                          border: '#2B7CE9',
                          highlight: { background: '#D2E5FF', border: '#2B7CE9' }
                      }
                  },
                  edges: {
                      font: {
                          size: 12,
                          color: '#000'
                      },
                      arrows: { to: { enabled: true, scaleFactor: 1 } },
                      color: { color: '#848484', highlight: '#848484' }
                  },
                  physics: {
                      enabled: true,
                      solver: 'forceAtlas2Based',
                      stabilization: { iterations: 150 }
                  },
                  interaction: {
                      hover: true,
                      tooltipDelay: 200
                  }
              };

              // Initialize the network graph
              new vis.Network(container, data, options);
          }
        </script>
      </body>
      </html>
    `;
}
