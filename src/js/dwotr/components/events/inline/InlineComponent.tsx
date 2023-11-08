import { NoteContainer, NoteSubtype } from '@/dwotr/model/ContainerTypes';
import { RepostKind } from '@/dwotr/network/provider';
import InlineReply from './InlineReply';
import InlineNote from './InlineNote';
import InlineRepost from './InlineRepost';
import InlineHighlight from './InlineHighlight';
import useVerticeMonitor from '@/dwotr/hooks/useVerticeMonitor';

export interface EventComponentProps {
  container?: NoteContainer;
}

const InlineComponent = ({ container }: EventComponentProps) => {


  const wot = useVerticeMonitor(
    container?.id! || 0,
    ['badMessage', 'neutralMessage', 'goodMessage'],
    '',
  ) as any;

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

      case NoteSubtype.Highlight:
        Component = InlineHighlight;
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
      wot={wot}
    />
  );
};

export default InlineComponent;
