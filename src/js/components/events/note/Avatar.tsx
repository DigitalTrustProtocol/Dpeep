import { Link } from 'preact-router';

import Key from '../../../nostr/Key';
import Show from '../../helpers/Show';
import Avatar from '../../user/Avatar';

const NoteAvatar = ({ event, isQuote, fullWidth, standalone }) => (
  <span className={`flex flex-col items-center flex-shrink-0 min-w-[40px] min-h-[40px] ${fullWidth ? 'mr-2' : 'mr-4'}`}>
    <Show when={event.pubkey}>
      <Link href={`/${event.pubkey}`}>
        <Avatar str={Key.toNostrBech32Address(event.pubkey, 'npub') as string} width={40} />
      </Link>
    </Show>
     <Show when={isQuote && !standalone}> 
       <div className="border-l-2 border-neutral-700 h-full"></div>
     </Show> 
  </span>
);

export default NoteAvatar;
