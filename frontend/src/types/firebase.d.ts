declare module 'firebase/app' {
  export const initializeApp: (config: any) => any;
  export const getApps: () => any[];
  export type FirebaseApp = any;
}

declare module 'firebase/auth' {
  export const getAuth: (app?: any) => any;
  export class RecaptchaVerifier {
    constructor(auth: any, container: string | HTMLElement, parameters?: any);
    render(): Promise<number>;
    clear(): void;
  }
  export const signInWithPhoneNumber: (auth: any, phoneNumber: string, appVerifier: any) => Promise<any>;
  export type ConfirmationResult = {
    confirm: (verificationCode: string) => Promise<any>;
    verificationId: string;
  };
  export type Auth = any;
}

