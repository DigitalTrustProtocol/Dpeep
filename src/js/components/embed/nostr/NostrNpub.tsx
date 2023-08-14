import { Link } from 'preact-router';

import Name from '../../user/Name';
import Embed from '../index';

const pubKeyRegex =
  /(?:^|\s|nostr:|(?:https?:\/\/[\w./]+)|iris\.to\/|snort\.social\/p\/|damus\.io\/)+((?:@)?npub[a-zA-Z0-9]{59,60})(?![\w/])/gi;

const NostrNpub: Embed = {
  regex: pubKeyRegex,
  component: ({ match }) => {
    const pub = match.replace('@', '');
    return (
      <Link href={`/${pub}`} className="link">
        {' '}
        <Name pub={pub} hideBadge={true} />
      </Link>
    );
  },
};

export default NostrNpub;
