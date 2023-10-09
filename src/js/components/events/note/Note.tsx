import { useEffect, useMemo } from 'react';
import classNames from 'classnames';
//import { Filter } from 'nostr-tools';
import { Link, route } from 'preact-router';

//import useSubscribe from '@/nostr/hooks/useSubscribe.ts';
import { getEventRoot, getNoteReplyingTo } from '@/nostr/utils';

import Key from '../../../nostr/Key';
import { translate as t } from '../../../translations/Translation.mjs';
import Show from '../../helpers/Show';
import EventComponent from '../EventComponent';

import Avatar from './Avatar';
import Content from './Content';

import useVerticeMonitor from '../../../dwotr/hooks/useVerticeMonitor';
import { ID } from '@/utils/UniqueIds';
import { RepliesFeed } from '../RepliesFeed';

interface NoteProps {
  event: any; // Define the proper type
  asInlineQuote?: boolean;
  isReply?: boolean;
  isQuote?: boolean;
  isQuoting?: boolean;
  showReplies?: number;
  showRepliedMsg?: boolean;
  standalone?: boolean;
  fullWidth?: boolean;
}

const Note: React.FC<NoteProps> = ({
  event,
  asInlineQuote = false,
  isReply = false,
  showReplies = 0,
  showRepliedMsg,
  standalone = false,
  fullWidth,
  isQuote = false,
  isQuoting = false,
}) => {
  const replyingTo = useMemo(() => getNoteReplyingTo(event), [event.id]);

  if (showRepliedMsg === undefined) {
    showRepliedMsg = standalone;
  }

  if (fullWidth === undefined) {
    fullWidth = !isReply && !isQuoting && !isQuote && !asInlineQuote;
  }


  //const computedIsQuote = () => isQuote || !!(!standalone && showReplies); // && replies.length),
  const computedIsQuoting = () => isQuoting || !!(replyingTo && showRepliedMsg);

  // const className = () => {
  //   return classNames({
  //     'cursor-pointer transition-all ease-in-out duration-200 hover:bg-neutral-999': !standalone,
  //     'pb-2': computedIsQuote,
  //     'pt-0': computedIsQuoting,
  //     'pt-4': !computedIsQuoting,
  //     'border-2 border-neutral-900 rounded-lg my-2': asInlineQuote,
  //     'full-width':
  //       fullWidth || (!isReply && !computedIsQuoting && !computedIsQuote && !asInlineQuote),
  //   });
  // };

  function messageClicked(clickEvent) {
    if (standalone) {
      return;
    }
    if (['A', 'BUTTON', 'TEXTAREA', 'IMG', 'INPUT'].find((tag) => clickEvent.target.closest(tag))) {
      return;
    }
    if (window.getSelection()?.toString()) {
      return;
    }
    clickEvent.stopPropagation();
    if (event.kind === 7) {
      const likedId = event.tags?.reverse().find((t) => t[0] === 'e')[1];
      return route(`/${likedId}`);
    }
    route(`/${Key.toNostrBech32Address(event.id, 'note')}`);
  }

  let threadRootId = getEventRoot(event) || replyingTo;

  const showReplyingTo = replyingTo && showRepliedMsg;
  const showThread =
    !standalone && !showRepliedMsg && !isReply && !computedIsQuoting && threadRootId;
  const showRepliesFeed = !!showReplies && standalone;
//  ${className}
  return (
    <>
      <Show when={showReplyingTo}>
        <EventComponent
          key={event.id + replyingTo}
          id={replyingTo!}
          isQuote={true}
          showReplies={0}
        />
      </Show>
      <div
        key={event.id + 'note'}
        className={`px-2 md:px-4 pb-2       `}  
        onClick={(e) => messageClicked(e)}
      >
        <Show when={showThread}>
          <Link
            className="text-iris-blue text-sm block mb-2"
            href={`/${Key.toNostrBech32Address(threadRootId || '', 'note')}`}
          >
            {t('show_thread')}
          </Link>
        </Show>
        <div className="flex flex-row" onClick={(e) => messageClicked(e)}>
          <Show when={!fullWidth}>
            <Avatar
              event={event}
              isQuote={isQuote}
              standalone={standalone}
              fullWidth={fullWidth}
            />
          </Show>
          <Content
            event={event}
            standalone={standalone}
            isQuote={isQuote}
            asInlineQuote={asInlineQuote}
            fullWidth={fullWidth}
          />
        </div>
      </div>
      {/* <Show when={!(computedIsQuote || asInlineQuote)}> */}
      <Show when={!isQuote}>
        <hr className="opacity-10 mb-2 mt-2" />
      </Show>
      <Show when={showRepliesFeed}>
        <RepliesFeed event={event} showReplies={showReplies} standalone={standalone} />
      </Show>
    </>
  );
};

export default Note;
