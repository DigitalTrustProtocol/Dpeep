import Show from '@/components/helpers/Show';
import { ReplyContainer } from '@/dwotr/model/ContainerTypes';
import EventComponent from './EventComponent';
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
      <Note container={container} isThread={isThread} focusId={focusId} />
    </>
  );
};

export default Reply;
