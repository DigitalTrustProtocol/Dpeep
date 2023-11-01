export class Url {
  public static isValid(urlString: string, protocol = ['https:', 'http:', 'wss:']) {
    try {
      const url = new URL(urlString);
      return protocol.includes(url.protocol);
    } catch (e) {
      return false;
    }
  }
}
