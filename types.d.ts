declare module 'free-proxy' {
  export interface ProxyListOptions {
    ip?: string;
    port?: string;
    country?: string;
    countryCode?: string;
  }
  
  export default class ProxyList {
    constructor();
    
    cached: any[];
    
    fetchProxiesList(page: number): Promise<any>;
    get(limit?: number): Promise<string[]>;
    getRandom(): Promise<string>;
  }
}