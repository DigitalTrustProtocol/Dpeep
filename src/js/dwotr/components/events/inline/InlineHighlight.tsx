import { route } from 'preact-router';
import { HighlightContainer } from '@/dwotr/model/ContainerTypes';
import { BECH32, UID } from '@/utils/UniqueIds';
import InlineAuthor from './InlineAuthor';
import Show from '@/components/helpers/Show';
import ReactionButtons from '@/components/events/buttons/ReactionButtons';
import InlineContent from './InlineContent';

interface HighlightProps {
  container: HighlightContainer; // Define the proper type
  showTools?: boolean;
  focusId?: UID;
}

const InlineHighlight = ({ container, showTools = false, focusId = 0 }: HighlightProps) => {
  return (
    <>
      <div
        className={`px-2 md:px-4 pb-2 flex flex-col`}
        onClick={(e) => messageClicked(e, container.id, false)}
      >
        <InlineAuthor container={container} showTools={showTools} />
        <InlineContent
          container={container}
          translatedText={undefined}
          showTools={showTools}
          className="italic"
          insertQuotes={true}
        />
        <Show when={container.soureUrl}>
        <div>
          Source: <a href={container.soureUrl} target="_blank" rel="noopener noreferrer" title={container.title}>{container.soureUrl}</a>
        </div>
        </Show>
        <Show when={showTools}>
          <ReactionButtons
            key={container.id + 'reactions'}
            standalone={focusId == container.id}
            event={container.event}
          />
        </Show>
      </div>
    </>
  );
};

export default InlineHighlight;

export const messageClicked = (clickEvent, eventId, standalone) => {
  if (standalone) {
    return;
  }
  if (['A', 'BUTTON', 'TEXTAREA', 'IMG', 'INPUT'].find((tag) => clickEvent.target.closest(tag))) {
    return;
  }
  if (window.getSelection()?.toString()) {
    return;
  }
  clickEvent.stopPropagation();

  // Send to destination open in new tab
  route(`/${BECH32(eventId, 'note')}`);

};
