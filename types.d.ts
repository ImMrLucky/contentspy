declare module 'proxy-lists' {
  import { EventEmitter } from 'events';
  
  export interface ProxyListsOptions {
    countries?: string[];
    protocols?: string[];
    anonymityLevels?: string[];
    ssl?: boolean;
    lastTested?: number;
  }
  
  export interface Proxy {
    host: string;
    port: number;
    protocols?: string[];
    country?: string;
    anonymityLevel?: string;
    lastTested?: number;
  }
  
  export function getProxies(options?: ProxyListsOptions): EventEmitter;
}