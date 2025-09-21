import { User } from "@shared/schema";

interface GoogleAuthResponse {
  credential: string;
}

export interface AuthUser extends User {}

export const parseGoogleCredential = (credential: string): { email: string; name: string; googleId: string } | null => {
  try {
    // In a real implementation, you would verify the JWT token with Google
    // For this demo, we'll decode the payload (not secure for production)
    const payload = JSON.parse(atob(credential.split('.')[1]));
    return {
      email: payload.email,
      name: payload.name,
      googleId: payload.sub,
    };
  } catch (error) {
    console.error('Failed to parse Google credential:', error);
    return null;
  }
};

export const initializeGoogleAuth = () => {
  return new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && window.google) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

export const signInWithGoogle = (): Promise<{ email: string; name: string; googleId: string }> => {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google SDK not loaded'));
      return;
    }

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-client-id',
      callback: (response: GoogleAuthResponse) => {
        const userData = parseGoogleCredential(response.credential);
        if (userData) {
          resolve(userData);
        } else {
          reject(new Error('Failed to parse Google response'));
        }
      },
    });

    window.google.accounts.id.prompt();
  });
};

// Global type declaration for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}
