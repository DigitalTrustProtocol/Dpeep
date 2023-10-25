import Embed, { EmbedData } from '../index';
import { ID } from '@/utils/UniqueIds';

const pubKeyRegex =
  /(?:^|\s|nostr:|(?:https?:\/\/[\w./]+)|iris\.to\/|snort\.social\/p\/|damus\.io\/)+((?:@)?npub[a-zA-Z0-9]{59,60})(?![\w/])/gi;

const NostrNpub: Embed = {
  regex: pubKeyRegex,
  component: ({ match }) => {
    let r = new EmbedData();
    const pub = match.replace('@', '');
    r.authors.add(ID(pub));
    return r;
  },
};

export default NostrNpub;
