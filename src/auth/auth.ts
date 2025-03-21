import * as vscode from 'vscode';
import { AuthService } from './authService';
import { HttpClient } from './httpClient';
import { ProjectsViewProvider } from './authViewProv';
export let authServiceInstance: AuthService | undefined;
export const auth = (context: vscode.ExtensionContext) => {
    const authService = new AuthService(context);
    authServiceInstance = authService;
    // Initialize HTTP client
    const httpClient = new HttpClient(authService);
    
    // Register the auth toggle command
    const toggleAuthCommand = vscode.commands.registerCommand('codenexus.toggleAuth', async () => {
      await authService.toggleAuth();
    });
    
    // Register a command to login
    const loginCommand = vscode.commands.registerCommand('codenexus.login', async () => {
      await authService.login();
    });
    
    // Register a command to logout
    const logoutCommand = vscode.commands.registerCommand('codenexus.logout', async () => {
      await authService.logout();
    });
    
    // Set context for menu items
    vscode.commands.executeCommand('setContext', 'codenexus.isAuthenticated', authService.isAuthenticated());
    authService.onDidAuthChange((isAuthenticated) => {
      vscode.commands.executeCommand('setContext', 'codenexus.isAuthenticated', isAuthenticated);
    });
    
    // Register projects view provider
    const projectsViewProvider = new ProjectsViewProvider(context.extensionUri, authService, httpClient);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('codenexus.projectsView', projectsViewProvider)
    );
    
    // Add commands to subscriptions
    context.subscriptions.push(toggleAuthCommand);
    context.subscriptions.push(loginCommand);
    context.subscriptions.push(logoutCommand);
}