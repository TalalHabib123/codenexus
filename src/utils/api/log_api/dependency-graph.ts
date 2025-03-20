import axios from 'axios';
import {ExpressResponseType } from '../../../types/logs';
import { FileNode } from '../../../types/graph';
import { BASE_URL} from '../api';


export const dependencyGraphLog = async (projectTitle: string, graphData: { [key: string]: Map<string, FileNode> }) => {
    try {
        console.log('Graph data:', graphData);
        const graph = convertGraphDataForMongoDB(graphData);
        // Use the converted graph data, not the original
        const response = await axios.post<ExpressResponseType>(`${BASE_URL}/logs/graph/add-or-update`, {
            projectTitle, 
            graphData: graph
        });
        console.log('Response:', response.data);
    } catch (error) {
        console.error(error);
        return { status: 'error', message: 'Failed to create project' };
    }
}

function convertGraphDataForMongoDB(graphData: { [key: string]: Map<string, FileNode> }) {
  // Create a plain JS object that matches the expected MongoDB structure
  const result: { [key: string]: any } = {};
  
  // Convert the outer structure
  for (const [folderPath, fileNodeMap] of Object.entries(graphData)) {
    // Handle file nodes (Map structure)
    if (fileNodeMap instanceof Map) {
      for (const [key, fileNode] of fileNodeMap.entries()) {
        // Convert Set to array for serialization
        const dependenciesArray = Array.from(fileNode.dependencies || []).map(dep => {
          return {
            name: dep.name,
            alias: dep.alias,
            valid: dep.valid,
            // Convert weight Set to array
            weight: Array.isArray(dep.weight) ? dep.weight : Array.from(dep.weight || [])
          };
        });
        
        // Store this file's data in the result
        result[key] = {
          name: fileNode.name,
          dependencies: dependenciesArray
        };
      }
    }
  }
  
  return result;
}