import { Link } from 'preact-router';

import Show from '@/components/helpers/Show';
import MyAvatar from '@/components/user/Avatar';
import { BECH32, STR, UID } from '@/utils/UniqueIds';

type Props = {
  authorId: UID;
  isQuote?: boolean;
  standalone?: boolean;
}
  

const NoteAvatar = ({ authorId, isQuote, standalone }: Props) => (
  <span className={`flex flex-col items-center flex-shrink-0 min-w-[40px] min-h-[40px] mr-2`}>
    <Link href={`/${BECH32(authorId)}`}>
      <MyAvatar str={STR(authorId) as string} width={40} />
    </Link>
    <Show when={isQuote && !standalone}>
      <div className="border-l-2 border-neutral-700 h-full"></div>
    </Show>
  </span>
);

export default NoteAvatar;
