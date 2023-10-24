import { memo } from 'preact/compat';
import { NoteContainer } from '@/dwotr/model/DisplayEvent';
import Reply from './Reply';
import Repost from './Repost';
import Note from './Note';
import { RepostKind } from '@/dwotr/network/WOTPubSub';
import { UID } from '@/utils/UniqueIds';

export type CompnentContext = {
  noteView: boolean; // False if the event is displayed in a feed
  foucsId: UID; // The id of the event that is currently focused (noteView)


  // isQuote?: boolean;
  // asInlineQuote?: boolean;
  // showReplies?: number;
};


export interface EventComponentProps {
  container?: NoteContainer;
  isThread?: boolean,
  showReplies?: number;
  focusId?: UID;
}

const EventComponent = ({
  container,
  showReplies = 1, // Show 1 level of replies by default
  isThread = false,
  focusId = 0,
}: EventComponentProps) => {
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

  if(container.kind == RepostKind) Component = Repost;
  
  if (!Component) return null;

  return (
    <Component
      container={container}
      showReplies={showReplies}
      isThread={isThread}
      focusId={focusId}
    />
  );
};

export default memo(EventComponent);
