// src/services/authService.ts
import * as vscode from 'vscode';
import * as http from 'http';
import { randomBytes } from 'crypto';
import * as querystring from 'querystring';
import polka from 'polka';
import cors from 'cors';
import bodyParser from 'body-parser';

// Secret storage key
const TOKEN_SECRET_KEY = 'codenexus.auth.token';
const USER_DATA_KEY = 'codenexus.auth.user';

export interface User {
  _id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Authentication service for VS Code extension
 */
export class AuthService {
  private _token: string | undefined;
  private _user: User | undefined;
  private _statusBarItem: vscode.StatusBarItem;
  private _onDidAuthChange: vscode.EventEmitter<boolean> = new vscode.EventEmitter<boolean>();
  public readonly onDidAuthChange: vscode.Event<boolean> = this._onDidAuthChange.event;

  constructor(private context: vscode.ExtensionContext) {
    // Create status bar item
    this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this._statusBarItem.command = 'codenexus.toggleAuth';
    this.context.subscriptions.push(this._statusBarItem);
    
    // Initialize from stored data
    this.initialize();
  }

  /**
   * Initialize the auth service from stored data
   */
  private async initialize(): Promise<void> {
    try {
      // Try to get token from secret storage
      this._token = await this.context.secrets.get(TOKEN_SECRET_KEY);
      
      // If token exists, try to get user data
      if (this._token) {
        const userData = await this.context.globalState.get<User>(USER_DATA_KEY);
        if (userData) {
          this._user = userData;
          this.updateStatusBar(true);
          this._onDidAuthChange.fire(true);
        } else {
          // We have a token but no user data, validate token
          await this.validateToken();
        }
      } else {
        this.updateStatusBar(false);
      }
    } catch (error) {
      console.error('Error initializing auth service:', error);
      this.updateStatusBar(false);
    }
  }

  /**
   * Validate the current token and fetch user data
   */
  private async validateToken(): Promise<boolean> {
    if (!this._token) {
      return false;
    }

    try {
      const response = await fetch('http://localhost:8004/auth/me', {
        headers: {
          'Authorization': `Bearer ${this._token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === "object" && "user" in data && data.user && 
            typeof data.user === "object" && "_id" in data.user && "username" in data.user) {
          this._user = data.user as User;
          await this.context.globalState.update(USER_DATA_KEY, this._user);
          this.updateStatusBar(true);
          this._onDidAuthChange.fire(true);
          return true;
        }
      }
      
      // If we get here, token is invalid
      await this.logout();
      return false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Get the current authentication token
   */
  public getToken(): string | undefined {
    return this._token;
  }

  /**
   * Get the current authenticated user
   */
  public getUser(): User | undefined {
    return this._user;
  }

  /**
   * Check if the user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this._token && !!this._user;
  }

  /**
   * Update the status bar to reflect authentication state
   */
  private updateStatusBar(authenticated: boolean): void {
    if (authenticated && this._user) {
      this._statusBarItem.text = `$(account) ${this._user.username}`;
      this._statusBarItem.tooltip = `Logged in as ${this._user.username}`;
    } else {
      this._statusBarItem.text = `$(account) Sign In`;
      this._statusBarItem.tooltip = 'Sign in to CodeNexus';
    }
    this._statusBarItem.show();
  }

  /**
   * Trigger the unified authentication flow
   */
  public async login(): Promise<boolean> {
    console.log('Starting unified authentication flow');
    
    // Generate a random state parameter for security
    const state = randomBytes(16).toString('hex');
    
    // Create server to handle the callback
    const server = this.createCallbackServer(state);
    const port = 45000; // Fixed port as specified
    
    // Start the server
    const redirectPromise = new Promise<boolean>((resolve) => {
      server.listen(port, () => {
        // URL to the login page with vscode state parameter
        const loginURL = `http://localhost:5173/vscode/login/${state}`;
        
        // Open the authentication page
        vscode.env.openExternal(vscode.Uri.parse(loginURL));
        
        console.log('Opening auth URL:', loginURL);
      });
      
      // Set a timeout to close the server if no response
      setTimeout(() => {
        server.server?.close();
        resolve(false);
      }, 10 * 60 * 1000); // 5 minutes timeout
    });
    
    return redirectPromise;
  }

  /**
   * Create a local server to handle the authentication callback
   */
  private createCallbackServer(expectedState: string): any {
    // Create a server
    const server = polka();
   
    server.use(cors(), bodyParser.json(), bodyParser.urlencoded({ extended: true }));
    server.post('/auth/callback', async (req: any, res: any) => {
        try {

           
            const token = req.body.token;
            const state = req.body.state;
            const user = req.body.user;
            console.log('Received auth callback:', req.body);
           console.log(token, state, user);
            // Check state parameter matches for security
            if (state !== expectedState) {
              console.error('Invalid state parameter:', state, expectedState);
              res.end(JSON.stringify({ success: false, error: 'Invalid state parameter' }));
              server.server?.close();
              return;
            }
            
            if (!token) {
              res.end(JSON.stringify({ success: false, error: 'No token received' }));
              server.server?.close();
              return;
            }
            
            // Store the token
            await this.context.secrets.store(TOKEN_SECRET_KEY, token);
            this._token = token;
            console.log(this._token);
            // If user data is provided in the callback, use it
            if (user && typeof user === "object" && "_id" in user && "username" in user) {
                console.log('User data received:', user);
              this._user = user as User;
              await this.context.globalState.update(USER_DATA_KEY, this._user);
              this.updateStatusBar(true);
              this._onDidAuthChange.fire(true);
              
              res.end(JSON.stringify({ success: true }));
              server.server?.close();
              return;
            }
            
            // If we don't have valid user data, validate token and get user info
            const success = await this.validateToken();
            
            if (success) {

              res.end(JSON.stringify({ success: true }));
            } else {
              res.end(JSON.stringify({ success: false, error: 'Failed to get user information' }));
            }
            server.server?.close();
          } catch (error) {
            console.error('Error in auth callback:', error);
            res.end(JSON.stringify({ success: false, error: 'An error occurred during authentication' }));
          }
     
    
        
        
        // Close the server
        
      });
    
    return server;
  }

  /**
   * Logout the current user
   */
  public async logout(): Promise<void> {
    try {
      // Clear token and user data
      this._token = undefined;
      this._user = undefined;
      
      // Clear from storage
      await this.context.secrets.delete(TOKEN_SECRET_KEY);
      await this.context.globalState.update(USER_DATA_KEY, undefined);
      
      // Update status bar
      this.updateStatusBar(false);
      
      // Fire auth change event
      this._onDidAuthChange.fire(false);
      
      // Call logout endpoint (not waiting for it)
      fetch('http://localhost:8004/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this._token}`
        }
      }).catch(error => {
        console.error('Error calling logout endpoint:', error);
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Toggle the authentication state (if authenticated, logout, otherwise show login options)
   */
  public async toggleAuth(): Promise<void> {
    if (this.isAuthenticated()) {
      await this.logout();
    } else {
      await this.login();
    }
  }
}