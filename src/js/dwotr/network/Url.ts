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
}
