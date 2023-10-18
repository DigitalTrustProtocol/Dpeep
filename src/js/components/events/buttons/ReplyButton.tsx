import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { Event } from 'nostr-tools';

import Key from '../../../nostr/Key';
import { ID } from '@/utils/UniqueIds';
import replyManager from '@/dwotr/ReplyManager';
import { throttle } from 'lodash';

type ReplyButtonProps = {
  event: Event;
  standalone?: boolean;
};

const ReplyButton = (props: ReplyButtonProps) => {
  const { replyCount } = useReplies(props.event.id);

  const onReplyBtnClicked = () => {
    if (props.standalone) {
      document.querySelector('textarea')?.focus();
    } else {
      route(`/${Key.toNostrBech32Address(props.event.id, 'note')}`);
    }
  };

  return (
    <a
      className="btn-ghost btn-sm hover:bg-transparent hover:text-iris-blue btn content-center rounded-none text-neutral-500"
      onClick={() => onReplyBtnClicked()}
    >
      <ChatBubbleOvalLeftIcon width={18} />
      <span>{replyCount || ''}</span>
    </a>
  );
};

export default ReplyButton;

const useReplies = (eventId: string) => {
  const [replyCount, setReplyCount] = useState<number>(0);

  useEffect(() => {
    let id = ID(eventId);

    let onUpdated = throttle(
      () => {
        let count = replyManager.replies.get(id)?.size || 0;
        setReplyCount(count);
      },
      1000,
      { leading: true, trailing: false },
    );

    onUpdated(); // Set initial Replies count.
    replyManager.updated.addListener(id, onUpdated);

    return () => {
      replyManager.updated.removeListener(id, onUpdated);
    };
  }, [eventId]);

  return { replyCount };
};
