const vscode = require('vscode');

export function createWebviewPanel(context: any, dependencyGraph: any) {
    // Create a Webview Panel
    const panel = vscode.window.createWebviewPanel(
        'dependencyGraph', // Internal ID
        'Dependency Graph', // Title
        vscode.ViewColumn.One, // Show in active editor
        {
            enableScripts: true, // Allow JS execution in Webview
        }
    );
console.log('-----------------dependencyGraph-----------------');
console.log(dependencyGraph);
console.log('-----------------------------------------');
    // Set the HTML Content
    panel.webview.html = getWebviewContent();

    // Send dependency graph data to the Webview
    panel.webview.postMessage(dependencyGraph);

    return panel;
}

export function getWebviewContent() {
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
            const dependencyGraph = event.data;
            renderGraph(dependencyGraph);
          });

          function renderGraph(dependencyGraph) {
              const nodes = [];
              const edges = [];

              // Parse the dependency graph
              Object.keys(dependencyGraph).forEach(filePath => {
                  // Add the current file as a node
                  nodes.push({ id: filePath, label: filePath });

                  const dependencies = Array.from(dependencyGraph[filePath].dependencies);
                  dependencies.forEach(dep => {
                      // Add edges with labels showing the relationship
                      edges.push({
                          from: filePath,
                          to: dep.name,
                          label: dep.type, // Display type like "import", "class", etc.
                          arrows: 'to', // Arrow direction
                          font: { align: 'top' },
                          color: { color: 'gray' }
                      });

                      // Add dependent nodes if they don't already exist
                      if (!nodes.find(node => node.id === dep.name)) {
                          nodes.push({ id: dep.name, label: dep.name });
                      }
                  });
              });

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

module.exports = {
    createWebviewPanel,
    getWebviewContent
};
