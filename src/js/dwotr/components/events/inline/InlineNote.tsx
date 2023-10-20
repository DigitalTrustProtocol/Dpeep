import { memo } from 'preact/compat';
import { route } from 'preact-router';

import { NoteContainer } from '@/dwotr/model/DisplayEvent';
import { BECH32, UID } from '@/utils/UniqueIds';
import InlineAuthor from './InlineAuthor';
import Show from '@/components/helpers/Show';
import ReactionButtons from '@/components/events/buttons/ReactionButtons';
import InlineContent from './InlineContent';

interface NoteProps {
  container: NoteContainer; // Define the proper type
  showTools?: boolean;
  focusId?: UID;
}

const InlineNote = ({ container, showTools = false, focusId = 0 }: NoteProps) => {
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
        />
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

export default memo(InlineNote);

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
  // if ( event.kind === 7) {
  //   const likedId = event.tags?.reverse().find((t) => t[0] === 'e')[1];
  //   return route(`/${likedId}`);
  // }
  route(`/${BECH32(eventId, 'note')}`);
};
