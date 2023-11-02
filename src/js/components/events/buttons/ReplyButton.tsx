import { memo } from 'preact/compat';
import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';

import { BECH32, UID } from '@/utils/UniqueIds';
import replyManager from '@/dwotr/ReplyManager';
import { throttle } from 'lodash';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';

type ReplyButtonProps = {
  eventId: UID;
  standalone?: boolean;
};

const ReplyButton = ({ eventId, standalone }: ReplyButtonProps) => {
  const { replies } = useReplies(eventId);

  return (
    <a
      className="btn-ghost btn-sm hover:bg-transparent hover:text-iris-blue btn content-center rounded-none text-neutral-500"
      onClick={() => onReplyBtnClicked(eventId, !!standalone)}
    >
      <ChatBubbleOvalLeftIcon width={18} />
      <span>{replies?.size || ''}</span>
    </a>
  );
};

export default memo(ReplyButton);

const onReplyBtnClicked = (eventId: UID, standalone: boolean) => {
  if (standalone) {
    document.querySelector('textarea')?.focus();
  } else {
    route(`/${BECH32(eventId, 'note')}`);
  }
};


const useReplies = (eventId: UID) => {
  const [replies, setReplies] = useState<Set<UID>>(new Set());
  const isMounted = useIsMounted();

  useEffect(() => {
    let onUpdated = throttle(
      () => {
        if (!isMounted()) return;
        setReplies(new Set(replyManager.replies.get(eventId)));
      },
      1000,
      { leading: true, trailing: true },
    );

    onUpdated(); // Set initial Replies count.
    replyManager.updated.addListener(eventId, onUpdated);

    return () => {
      replyManager.updated.removeListener(eventId, onUpdated);
    };
  }, [eventId]);

  return { replies };
};
