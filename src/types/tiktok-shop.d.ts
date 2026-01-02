declare module 'tiktok-shop' {
    export function signByUrl(url: string, appSecret: string, body: any): { signature: string, timestamp: number };
    // Add other methods if needed
}
