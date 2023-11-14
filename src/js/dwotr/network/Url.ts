import { normalizeURL } from "nostr-tools/utils";

export class Url {
  public static isProtocol(urlString: string, protocol = ['https:', 'http:', 'wss:', 'ws:']) {
    if(!urlString) return false;
    try {
      const url = new URL(urlString);
      return protocol.includes(url.protocol);
    } catch (e) {
      return false;
    }
  }

  public static isWebSocket(protocol: string) {
    return ['wss:', 'ws:'].includes(protocol);
  }

  public static sanitize(urlString: string) : string |undefined {
    try {
      const url = new URL(urlString?.trim());
      return url.toString().replace(/\/$/, '');
    } catch (e) {
      return;
    }
  }

  public static isLocal(hostname: string) {
      if(hostname == 'localhost') return true;
      if(hostname.startsWith('127.')) return true;
      if(hostname.startsWith('192.168.')) return true;
      if(hostname.startsWith('10.')) return true;
      if(hostname.startsWith('172.')) {
        let parts = hostname.split('.');
        if(parts.length != 4) return false;
        let second = parseInt(parts[1]);
        if(second >= 16 && second <= 31) return true;
      }
    return false;
  }




  public static normalize(urlString: string) : string |undefined {
    if(!urlString) return;
    try {
      return normalizeURL(urlString?.trim()).replace(/\/$/, '');
    } catch (e) {
      return;
    }
  }

  public static normalizeArray(urls: string | string[] | undefined) {
    if(!urls) return [];
    if(typeof urls == 'string') urls = [urls];
    let normalized: Set<string> = new Set<string>();
    for(const url in urls) {
      let n = Url.normalize(url);
      if(!n) continue; // invalid url, empty string, etc.
      normalized.add(url.toString().replace(/\/$/, ''));
    }
    return [...normalized]; // return as array filtering out duplicates
  }

  // This is used to normalize relay url string, and return undefined if it is not a valid relay websocket url or is a local url
  public static normalizeRelay(relay: string | undefined) {
    if(!relay) return;
    let url = Url.normalize(relay);
    if(!url) return;
    let urlInstance = new URL(url);
    if(!Url.isWebSocket(urlInstance.protocol)) return; // Not a websocket
    if(Url.isLocal(urlInstance.hostname)) return; // Local
    return url;
  }

}
