// src/types/auth.types.ts

/**
 * Error response from the authentication endpoints
 */
export interface AuthErrorResponse {
    /** Error message */
    error: string;
    /** Optional error code */
    code?: string;
    /** Optional additional details */
    details?: string;
  }
  
  /**
   * Successful token response from authentication endpoints
   */
  export interface TokenResponse {
    /** JWT token for authentication */
    token: string;
    /** Token expiration time in seconds */
    expiresIn?: number;
    /** Token type (usually 'Bearer') */
    tokenType?: string;
    /** Optional user information returned with the token */
    user?: {
      id: string;
      username: string;
      email?: string;
      github_id?: number;
      google_id?: string;
    };
  }
  
  /**
   * Code exchange request payload
   */
  export interface CodeExchangeRequest {
    /** Authorization code received from OAuth provider */
    code: string;
    /** PKCE code verifier used to secure the flow */
    code_verifier: string;
  }
  
  /**
   * Response from the user validation endpoint
   */
  export interface UserValidationResponse {
    /** Whether the token is valid */
    valid: boolean;
    /** Basic user information */
    user?: {
      id: string;
      username: string;
    };
  }