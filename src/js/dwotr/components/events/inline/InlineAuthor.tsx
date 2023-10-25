import { memo } from 'preact/compat';
import { useMemo } from 'react';
import { Link } from 'preact-router';

import Name from '../Name';
import RelativeTime from '@/components/RelativeTime';
import { NoteContainer } from '@/dwotr/model/ContainerTypes';
import { BECH32, STR } from '@/utils/UniqueIds';
import MyAvatar from '@/components/user/Avatar';
import Show from '@/components/helpers/Show';
import EventDropdown from '@/components/events/EventDropdown';

type Props = {
  container: NoteContainer;
  showTools?: boolean;
};

const InlineAuthor = ({ container, showTools = false }: Props) => {
  const { time, dateStr, timeStr } = useMemo(
    () => authorDates(container?.event!.created_at),
    [container?.event!.created_at],
  );
  const authorId = container!.authorId!;

  return (
    <div className="flex items-center gap-2 h-12">
      <Link href={`/${BECH32(authorId, 'npub')}`}>
        <MyAvatar str={STR(authorId) as string} width={40} />
      </Link>
      <div>
        <Link href={`/${BECH32(authorId, 'npub')}`} className="font-bold">
          <Name id={authorId} />
        </Link>
        <small className="text-neutral-500">
          <span className="mx-2">·</span>
          <Link
            href={`/${BECH32(container?.id, 'note')}`}
            className="tooltip"
            data-tip={`${dateStr} ${timeStr}`}
          >
            <RelativeTime date={time} />
          </Link>
        </small>
      </div>
      <Show when={showTools}>
        <div className="flex-1 flex items-center justify-end">
          <EventDropdown id={container!.event!.id} event={container!.event} />
        </div>
      </Show>
    </div>
  );
};

export default memo(InlineAuthor);

export const authorDates = (created_at: number) => {
  const t = new Date(created_at * 1000);
  const dStr = t.toLocaleString(window.navigator.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const tStr = t.toLocaleTimeString(window.navigator.language, {
    timeStyle: 'short',
  });

  return { time: t, dateStr: dStr, timeStr: tStr };
};
