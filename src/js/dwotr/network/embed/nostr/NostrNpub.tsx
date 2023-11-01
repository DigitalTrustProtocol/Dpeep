import Key from '@/nostr/Key';
import Embed, { EmbedData } from '../index';

const pubKeyRegex =
  /(?:^|\s|nostr:|(?:https?:\/\/[\w./]+)|iris\.to\/|snort\.social\/p\/|damus\.io\/)+((?:@)?npub[a-zA-Z0-9]{59,60})(?![\w/])/gi;

const NostrNpub: Embed = {
  regex: pubKeyRegex,
  component: ({ match }) => {
    let r = new EmbedData();
    const hex = Key.toNostrHexAddress(match.replace('@', '').trim());
    if (!hex) return r; // Invalid address, ignore

    r.setAuthor({ author: hex });
    return r;
  },
};

export default NostrNpub;
