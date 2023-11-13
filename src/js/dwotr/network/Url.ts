import { normalizeURL } from "nostr-tools/utils";

export class Url {
  public static isValid(urlString: string, protocol = ['https:', 'http:', 'wss:']) {
    try {
      const url = new URL(urlString);
      return protocol.includes(url.protocol);
    } catch (e) {
      return false;
    }
  }

  public static isWss(urlString: string) {
    return Url.isValid(urlString?.trim(), ['wss:']);
  }

  public static sanitize(urlString: string) : string |undefined {
    try {
      const url = new URL(urlString?.trim());
      return url.toString().replace(/\/$/, '');
    } catch (e) {
      return;
    }
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

}
