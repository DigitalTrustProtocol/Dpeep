import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';

import Key from '../../../nostr/Key';
import { ID } from '@/utils/UniqueIds';
import noteManager from '@/dwotr/NoteManager';

type ReplyProps = {
  event: any; // Define the proper type
  standalone?: boolean;
};

const Reply = (props: ReplyProps) => {
  const [replyCount, setReplyCount] = useState<number>(0);

  useEffect(() => {
  let count = noteManager.replies.get(ID(props.event.id))?.size || 0;
    setReplyCount(count);
  }, [props.event]);

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
