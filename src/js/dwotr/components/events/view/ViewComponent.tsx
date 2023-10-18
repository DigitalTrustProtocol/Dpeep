import { route } from 'preact-router';

import { NoteContainer, RepostContainer } from '@/dwotr/model/DisplayEvent';
import Reply from '../Reply';
import Note from '../Note';
import { RepostKind } from '@/dwotr/network/WOTPubSub';
import { BECH32, UID } from '@/utils/UniqueIds';
import InlineNote from '../inline/InlineNote';

export interface EventComponentProps {
  container?: NoteContainer;
  showReplies?: number;
  showTools?: boolean;
  focusId?: UID;
}

const ViewComponent = ({ container, focusId = 0, showReplies = 100 }: EventComponentProps) => {
  if (!container) return null;

  // Make sure to route to the original note if the container is a repost
  const routeRepost = () => {
    let repost = container as RepostContainer;
    if (!repost.repostOf) return;
    route(`/${BECH32(repost.repostOf!)}`);
  };

  let Component: any = null;

  if (container.kind == 1) {
    switch (container?.subtype!) {
      case 2:
        Component = Reply;
        break;
      case 3:
        routeRepost();
        break;
      default:
        Component = container.id == focusId ? InlineNote : Note;
        break;
    }
  }

  if (container.kind == RepostKind) {
    routeRepost();
  }

  if (!Component) return null;

  return <Component container={container} focusId={focusId} showTools={true} showReplies={showReplies} />;
};

export default ViewComponent;
