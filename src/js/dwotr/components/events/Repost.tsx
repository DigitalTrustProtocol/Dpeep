import EventComponent from './EventComponent';
import { RepostContainer } from '@/dwotr/model/DisplayEvent';

import { RepostName, useRepost } from './inline/InlineRepost';

type RepostProps = {
  container?: RepostContainer;
  isThread?: boolean,
  showReplies?: number;
  focusId?: number;
};

export default function Repost({ container, focusId, showReplies, isThread }: RepostProps) {
  const { repostOf, repostCount } = useRepost(container!);

  if (!repostOf) return null;

  return (
    <>
      <RepostName authorId={container?.authorId!} repostCount={repostCount} />
      <EventComponent container={repostOf}
            showReplies={showReplies}
            isThread={isThread}
            focusId={0}
      />
    </>
  );
}
