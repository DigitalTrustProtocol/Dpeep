import Embed, { EmbedData as EmbedData } from '../index';
import Key from '@/nostr/Key';

const eventRegex =
  /(?:^|\s|nostr:|(?:https?:\/\/[\w./]+)|iris\.to\/|snort\.social\/e\/|damus\.io\/)+((?:@)?note[a-zA-Z0-9]{59,60})(?![\w/])/gi;

const NostrNote: Embed = {
  regex: eventRegex,
  component: ({ match }) => {
    let r = new EmbedData();
    const hex = Key.toNostrHexAddress(match.replace('@', '').trim());
    if (!hex) return r; // Invalid address, ignore
    r.setEvent({ id: hex });
    return r;
  },
};


export default NostrNote;
