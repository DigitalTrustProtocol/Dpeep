import { memo } from 'preact/compat';
import { NoteContainer } from '@/dwotr/model/DisplayEvent';
import { RepostKind } from '@/dwotr/network/WOTPubSub';
import InlineReply from './InlineReply';
import InlineNote from './InlineNote';
import InlineRepost from './InlineRepost';

export interface EventComponentProps {
  container?: NoteContainer;
}

const InlineComponent = ({ container }: EventComponentProps) => {

  if(!container) return null;

  let Component: any = null;
  if (container.kind == 1) {

    switch (container?.subtype!) {
      case 2:
        Component = InlineReply;
        break;
      case 3:
        Component = InlineRepost;
        break;
      default:
        Component = InlineNote;
        break;
    }
  }
  if(container.kind == RepostKind) {
    Component = InlineRepost;
  };

  if (!Component) return null;

  return (
    <Component
      container={container}
    />
  );
};

export default memo(InlineComponent);
