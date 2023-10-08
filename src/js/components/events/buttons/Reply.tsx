import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { Event } from 'nostr-tools';

import Key from '../../../nostr/Key';
import { ID } from '@/utils/UniqueIds';
import replyManager from '@/dwotr/ReplyManager';
import { throttle } from 'lodash';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';

type ReplyProps = {
  event: Event; 
  standalone?: boolean;
};

const Reply = (props: ReplyProps) => {
  const { replyCount } = useReplies(props.event.id);

  function replyBtnClicked() {
    if (props.standalone) {
      document.querySelector('textarea')?.focus();
    } else {
      route(`/${Key.toNostrBech32Address(props.event.id, 'note')}`);
    }
  }

  return (
    <a
      className="btn-ghost btn-sm hover:bg-transparent hover:text-iris-blue btn content-center gap-2 rounded-none text-neutral-500"
      onClick={() => replyBtnClicked()}
    >
      <ChatBubbleOvalLeftIcon width={18} />
      <span>{replyCount || ''}</span>
    </a>
  );
};

export default Reply;

const useReplies = (eventId: string) => {
  const [replyCount, setReplyCount] = useState<number>(0);
  const isMounted = useIsMounted();

  useEffect(() => {
    let id = ID(eventId);

    let onEvent = throttle(() => {
      if (!isMounted()) return; // Component has been unmounted, discard event.
      let count = replyManager.replies.get(id)?.size || 0;
      setReplyCount(count);

    }, 1000, { leading: true, trailing: false });

    onEvent(); // Set initial zaps
    replyManager.onEvent.addListener(id, onEvent);

    }, [eventId]);
  
  return { replyCount };
}
