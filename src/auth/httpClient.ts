
// import { AuthService } from './authService';
// import fetch, { Response as FetchResponse } from 'node-fetch';

// /**
//  * HTTP client for making authenticated API requests
//  */
// export class HttpClient {
//   private baseUrl: string = 'http://localhost:8004';

//   constructor(private authService: AuthService) {}

//   /**
//    * Make an authenticated GET request
//    */
//   public async get<T>(path: string): Promise<T> {
//     const response = await this.makeRequest(path, 'GET');
//     const data = await response.json();
//     return data as T;
//   }

//   /**
//    * Make an authenticated POST request
//    */
//   public async post<T>(path: string, data?: any): Promise<T> {
//     const response = await this.makeRequest(path, 'POST', data);
//     const responseData = await response.json();
//     return responseData as T;
//   }

//   /**
//    * Make an authenticated PUT request
//    */
//   public async put<T>(path: string, data?: any): Promise<T> {
//     const response = await this.makeRequest(path, 'PUT', data);
//     const responseData = await response.json();
//     return responseData as T;
//   }

//   /**
//    * Make an authenticated DELETE request
//    */
//   public async delete<T>(path: string): Promise<T> {
//     const response = await this.makeRequest(path, 'DELETE');
//     const responseData = await response.json();
//     return responseData as T;
//   }

//   /**
//    * Make an authenticated request
//    */
//   private async makeRequest(path: string, method: string, data?: any): Promise<FetchResponse> {
//     const url = `${this.baseUrl}${path}`;
//     const token = this.authService.getToken();
    
//     const headers: Record<string, string> = {
//       'Content-Type': 'application/json'
//     };
    
//     if (token) {
//       headers['Authorization'] = `Bearer ${token}`;
//     }
    
//     const options: {
//       method: string;
//       headers: Record<string, string>;
//       body?: string;
//     } = {
//       method,
//       headers,
//     };
    
//     if (data) {
//       options.body = JSON.stringify(data);
//     }
    
//     // Using node-fetch
//     const response = await fetch(url, options);
    
//     // Handle authentication errors
//     if (response.status === 401) {
//       // Token expired or invalid
//       await this.authService.logout();
//       throw new Error('Authentication required');
//     }
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`HTTP error ${response.status}: ${errorText}`);
//     }
    
//     return response;
//   }
// }



// src/services/httpClient.ts
import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import { AuthService } from './authService';

/**
 * HTTP client for making authenticated API requests
 */
export class HttpClient {
  private baseUrl: string = 'http://localhost:8004';

  constructor(private authService: AuthService) {}

  /**
   * Make an authenticated GET request
   */
  public async get<T>(path: string): Promise<T> {
    return this.makeRequest<T>(path, 'GET');
  }

  /**
   * Make an authenticated POST request
   */
  public async post<T>(path: string, data?: any): Promise<T> {
    return this.makeRequest<T>(path, 'POST', data);
  }

  /**
   * Make an authenticated PUT request
   */
  public async put<T>(path: string, data?: any): Promise<T> {
    return this.makeRequest<T>(path, 'PUT', data);
  }

  /**
   * Make an authenticated DELETE request
   */
  public async delete<T>(path: string): Promise<T> {
    return this.makeRequest<T>(path, 'DELETE');
  }

  /**
   * Make an authenticated request using the built-in http/https modules
   */
  private makeRequest<T>(path: string, method: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.baseUrl}${path}`;
      const parsedUrl = url.parse(fullUrl);
      
      const token = this.authService.getToken();
      
      const headers: http.OutgoingHttpHeaders = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const requestOptions: http.RequestOptions = {
        method: method,
        headers: headers,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path
      };
      
      // Choose http or https module based on protocol
      const requestModule = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = requestModule.request(requestOptions, (res) => {
        let responseData = '';
        
        // Handle response
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          // Handle authentication errors
          if (res.statusCode === 401) {
            this.authService.logout().then(() => {
              reject(new Error('Authentication required'));
            }).catch(error => {
              reject(error);
            });
            return;
          }
          
          // Handle other errors
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            reject(new Error(`HTTP error ${res.statusCode}: ${responseData}`));
            return;
          }
          
          // Parse JSON response
          try {
            const parsedData = responseData ? JSON.parse(responseData) : {};
            resolve(parsedData as T);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });
      
      // Handle request errors
      req.on('error', (error) => {
        reject(error);
      });
      
      // Send request data if provided
      if (data) {
        const requestBody = JSON.stringify(data);
        req.write(requestBody);
      }
      
      // End the request
      req.end();
    });
  }
}