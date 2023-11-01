import { memo } from 'react';
import { NoteContainer } from '@/dwotr/model/ContainerTypes';
import Reply from './Reply';
import Repost from './Repost';
import Note from './Note';
import { RepostKind } from '@/dwotr/network/WOTPubSub';
import { UID } from '@/utils/UniqueIds';
import useVerticeMonitor from '@/dwotr/hooks/useVerticeMonitor';
import { useEventContainer } from '@/dwotr/hooks/useEventContainer';

// export type CompnentContext = {
//   noteView: boolean; // False if the event is displayed in a feed
//   foucsId: UID; // The id of the event that is currently focused (noteView)

//   // isQuote?: boolean;
//   // asInlineQuote?: boolean;
//   // showReplies?: number;
// };

export interface EventComponentProps {
  id?: UID;
  isThread?: boolean;
  showReplies?: number;
  focusId?: UID;
}

const EventComponent = ({
  id,
  showReplies = 1, // Show 1 level of replies by default
  isThread = false,
  focusId = 0,
}: EventComponentProps) => {

  const { container } = useEventContainer<NoteContainer>(id!);

  const wot = useVerticeMonitor(
    id! || 0,
    ['badMessage', 'neutralMessage', 'goodMessage'],
    '',
  ) as any;

  if (!container) return null;

  // If no focusId is provided, use the container id as starting point
  // This way the first component will know it is the first one
  //if(focusId == 0) focusId = container.id;

  let Component: any = null;
  if (container.kind == 1) {
    switch (container?.subtype!) {
      case 2:
        Component = Reply;
        break;
      case 3:
        Component = Repost;
        break;
      default:
        Component = Note;
        break;
    }
  }

  if (container.kind == RepostKind) Component = Repost;

  if (!Component && Component != Note) return null;

  return (
    <Component
      container={container}
      showReplies={showReplies}
      isThread={isThread}
      focusId={focusId}
      wot={wot}
    />
  );
};

export default memo(EventComponent);
