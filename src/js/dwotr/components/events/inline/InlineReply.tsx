import { memo } from 'preact/compat';
import { ReplyContainer } from '@/dwotr/model/DisplayEvent';
import { BECH32, UID } from '@/utils/UniqueIds';
import { Link } from 'preact-router';
import { translate as t } from '../../../../translations/Translation.mjs';
import { useEventContainer } from '@/dwotr/hooks/useEventContainer';
import InlineNote from './InlineNote';
import Name from '../Name';
import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';

type ReplyProps = {
  container: ReplyContainer; // Define the proper type
};

const InlineReply: React.FC<ReplyProps> = ({ container }: ReplyProps) => {
  const { container: repliedTo } = useEventContainer(container!.repliedTo! || container!.rootId!);

  if (!repliedTo) return null;

  return (
    <>
      <RepliedToName replyToAuthorId={repliedTo.authorId!} replyToEventId={repliedTo.id!} />
      <InlineNote container={container} />
    </>
  );
};

export default memo(InlineReply);

type RepliedToNameProps = {
  replyToAuthorId: UID;
  replyToEventId: UID;
};

const RepliedToName = memo(({ replyToAuthorId, replyToEventId }: RepliedToNameProps) => (
  <div className="flex gap-1 items-center text-sm text-neutral-500 px-2 pt-2">
    <div className="flex flex-row">
      <i className="min-w-[40px] mr-4 mb-2 flex justify-end">
        <ChatBubbleOvalLeftIcon width={18} />
      </i>
      <div className="flex flex-row">
        <span>
          Replied to&nbsp; 
        </span>
        <Link href={`/${BECH32(replyToAuthorId)}`}>
          <Name id={replyToAuthorId} hideBadge={true} />
        </Link>
        <Link
          className="text-iris-blue text-sm block mb-2"
          href={`/${BECH32(replyToEventId, 'note')}`}
        >
           &nbsp;... {t('show_thread')}
        </Link>
      </div>
    </div>
  </div>
));
