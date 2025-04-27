declare module 'free-proxy' {
  export interface ProxyOptions {
    country?: string;
    https?: boolean;
    anonymity?: number;
  }
  
  export default class FreeProxy {
    constructor(options?: ProxyOptions);
    
    country: string;
    protocol: string;
    
    get(limit?: number): Promise<string[]>;
    getRandom(): Promise<string>;
  }
}