import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'preact/hooks';
import { route } from 'preact-router';

import Events from '../../../nostr/Events';
import Key from '../../../nostr/Key';
import useStateThrottle from '@/dwotr/hooks/useStateThrottle';

const Reply = (props) => {
  // useStateThrottle: Make sure only to update UI once per second
  const [replyCount, setReplyCount] = useStateThrottle(
    Events.threadRepliesByMessageId.get(props.event.id)?.size || 0,
  );

  useEffect(() => {
    return Events.getThreadRepliesCount(props.event.id, handleThreadReplyCount);
  }, [props.event]);

  const handleThreadReplyCount = (threadReplyCount) => {
    setReplyCount(threadReplyCount);
  };

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
