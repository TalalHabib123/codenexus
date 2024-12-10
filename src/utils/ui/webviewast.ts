import * as vscode from 'vscode';
import { WebviewPanel } from 'vscode';
import * as path from 'path';

const parseDependencyGraph = (dependencyGraph: any): { nodes: any[]; edges: any[] } => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const visitedNodes = new Set<string>();

    const visitNode = (node: any, graph: any) => {
        if (visitedNodes.has(node.name)) {
            return;
        }

        visitedNodes.add(node.name);
        nodes.push({
            id: node.name,
            label: path.basename(node.name),
        });

        node.dependencies.forEach((dep: any) => {
            dep.weight.forEach((weight: any) => {
                if (weight.source === 'Exporting') {
                    visitNode(graph.get(dep.name), graph);
                }
            });
            edges.push({
                from: node.name,
                to: dep.name,
                weights: dep.weight,
            });
        });
    };

    for (let [key, value] of dependencyGraph) {
        visitNode(value, dependencyGraph);
    }

    return { nodes, edges };
};

export function createWebviewPanel(context: vscode.ExtensionContext, dependencyGraph: any): WebviewPanel {
    let innerMap = Object.keys(dependencyGraph).map((key) => {
        return dependencyGraph[key];
    });
    innerMap = innerMap[0];
    const { nodes, edges } = parseDependencyGraph(innerMap);

    const panel = vscode.window.createWebviewPanel(
        'dependencyGraph',
        'Dependency Graph',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );

    panel.webview.html = getWebviewContent();
    panel.webview.postMessage({ nodes, edges });

    return panel;
}

export function getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Dependency Graph</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          #controls {
            display: flex;
            align-items: center;
            padding: 10px;
            background-color: #f1f1f1;
          }
          #controls h1 {
            margin: 0;
            padding-right: 20px;
            font-size: 24px;
          }
          #controls button {
            margin-right: 10px;
            padding: 5px 10px;
            font-size: 14px;
            cursor: pointer;
          }
          #network {
            width: 100%;
            height: calc(100vh - 60px);
            border: 1px solid lightgray;
          }
        </style>
      </head>
      <body>
        <div id="controls">
          <h1>Dependency Graph</h1>
          <button id="showImporting">Show Importing</button>
          <button id="showExporting">Show Exporting</button>
          <button id="showAll">Show All</button>
        </div>
        <div id="network"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.js"></script>
        <script>
          const vscode = acquireVsCodeApi();
          let allEdges = [];
          let network;

          window.addEventListener('message', event => {
            const { nodes, edges } = event.data;
            allEdges = edges;
            renderGraph(nodes, edges);
          });

          function renderGraph(nodes, edges) {
              const container = document.getElementById('network');
              const data = {
                  nodes: new vis.DataSet(nodes),
                  edges: new vis.DataSet(edges.map(edge => ({
                      ...edge,
                      labels: Array.from(new Set(edge.weights.map(weight => weight.source))),
                      label: ''
                  })))
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
                          color: '#000',
                          align: 'top'
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

              network = new vis.Network(container, data, options);

              network.on('click', function (params) {
                  if (params.nodes.length > 0) {
                      expandEdgesForNode(params.nodes[0]);
                  }
              });
          }

          function expandEdgesForNode(nodeId) {
              const existingEdges = network.body.data.edges.get();
              const connectedEdges = existingEdges.filter(edge => edge.from === nodeId || edge.to === nodeId);
              
              network.body.data.edges.remove(connectedEdges);

              const expandedEdges = [];
              connectedEdges.forEach(edge => {
                  const originalEdge = allEdges.find(e => e.from === edge.from && e.to === edge.to);
                  if (originalEdge) {
                      originalEdge.weights.forEach(weight => {
                          expandedEdges.push({
                              id: \`\${edge.from}-\${edge.to}-\${weight.name}-\${weight.alias}\`,
                              from: edge.from,
                              to: edge.to,
                              label: \`alias: \${weight.alias}\\nname: \${weight.name}\\nsource: \${weight.source}\\ntype: \${weight.type}\`,
                          });
                      });
                  }
              });

              network.body.data.edges.add(expandedEdges);
          }

          document.getElementById('showImporting').addEventListener('click', () => {
              filterEdges('Importing');
          });

          document.getElementById('showExporting').addEventListener('click', () => {
              filterEdges('Exporting');
          });

          document.getElementById('showAll').addEventListener('click', () => {
              filterEdges(null);
          });

          function filterEdges(labelFilter) {
              const filteredEdges = labelFilter
                  ? allEdges.filter(edge => edge.weights.some(weight => weight.source === labelFilter))
                  : allEdges;

              const processedEdges = filteredEdges.map(edge => {
                  const uniqueLabels = Array.from(new Set(edge.weights.map(weight => weight.source)));
                  return {
                      from: edge.from,
                      to: edge.to,
                      label: uniqueLabels.join(', '),
                  };
              });

              const data = {
                  nodes: network.body.data.nodes,
                  edges: new vis.DataSet(processedEdges)
              };

              network.setData(data);
          }
        </script>
      </body>
      </html>
    `;
}