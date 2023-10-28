import EventComponent from './EventComponent';
import { RepostContainer } from '@/dwotr/model/ContainerTypes';

import { RepostName, useRepost } from './inline/InlineRepost';

type RepostProps = {
  container?: RepostContainer;
  isThread?: boolean,
  showReplies?: number;
  focusId?: number;
};

const Repost = ({ container, focusId, showReplies, isThread }: RepostProps) => {
  const { repostOf, repostCount } = useRepost(container!);

  if (!repostOf) return null;

  return (
    <>
      <RepostName authorId={container?.authorId!} repostCount={repostCount} />
      <EventComponent id={repostOf.id}
            showReplies={showReplies}
            isThread={isThread}
            focusId={focusId}
      />
    </>
  );
}

export default Repost;