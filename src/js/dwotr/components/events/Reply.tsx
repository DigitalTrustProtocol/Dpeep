import Show from '@/components/helpers/Show';
import { ReplyContainer } from '@/dwotr/model/DisplayEvent';
import { BECH32 } from '@/utils/UniqueIds';
import { Link } from 'preact-router';
import EventComponent from './EventComponent';
import { translate as t } from '../../../translations/Translation.mjs';
import { useEventContainer } from '@/dwotr/hooks/useEventContainer';
import Note from './Note';

type ReplyProps = {
  container: ReplyContainer; // Define the proper type
  isThread?: boolean;
  showReplies?: number;
  focusId?: number;
};

const Reply: React.FC<ReplyProps> = ({
  container,
  isThread,
  showReplies = 1,
  focusId = 0,
}: ReplyProps) => {

  const { container:repliedTo } = useEventContainer(container?.repliedTo! || container?.rootId!);

  if(!repliedTo) return null;
  
  if(!isThread && container.id != focusId) isThread = true;

  let isRoot = container?.rootId! === repliedTo.id;

  return (
    <>
      <Show when={showReplies > 0}>
        <EventComponent
          container={repliedTo}
          isThread={true}
          showReplies={showReplies - 1}
          focusId={focusId}
        />
      </Show>
      <Note container={container} isThread={isThread} focusId={0} />
      <Show when={!isRoot}>
        <Link
          className="text-iris-blue text-sm block mb-2"
          href={`/${BECH32(container.id!, 'note')}`}
        >
          {t('show_thread')}
        </Link>
      </Show>
    </>
  );
};

export default Reply;
