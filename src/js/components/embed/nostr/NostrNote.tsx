import InLineQuote from '@/dwotr/components/events/inline/InlineQuote';
import Key from '../../../nostr/Key';
import Embed from '../index';

const eventRegex =
  /(?:^|\s|nostr:|(?:https?:\/\/[\w./]+)|iris\.to\/|snort\.social\/e\/|damus\.io\/)+((?:@)?note[a-zA-Z0-9]{59,60})(?![\w/])/gi;

const NostrUser: Embed = {
  regex: eventRegex,
  component: ({ match }) => {
    const hex = Key.toNostrHexAddress(match.replace('@', '').trim())!;
    return <InLineQuote id={hex} key={hex} />;
  },
};

export default NostrUser;
