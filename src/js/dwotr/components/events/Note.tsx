import { NoteContainer } from '@/dwotr/model/DisplayEvent';
import { UID } from '@/utils/UniqueIds';
import Content from './Content';
import ReactionButtons from '@/components/events/buttons/ReactionButtons';
import { messageClicked } from './inline/InlineNote';
import InlineAuthor from './inline/InlineAuthor';
import Show from '@/components/helpers/Show';

interface NoteProps {
  container: NoteContainer; // Define the proper type
  isThread?: boolean;
  focusId?: UID;
}

const Note: React.FC<NoteProps> = ({ container, isThread = false, focusId = 0 }: NoteProps) => {
  return (
    <>
      <div
        key={container.id + 'note'}
        className={`px-2 md:px-4 pb-2 flex flex-col`}
        onClick={(e) => messageClicked(e, container.id, false)}
      >
        <InlineAuthor container={container} showTools={true} />
        <div className="flex flex-row">
          <div className="flex flex-col items-center flex-shrink-0 min-w-[40px] min-h-[40px] mr-2">
            <Show when={isThread}>
              <div className="border-l-2 border-neutral-700 h-full"></div>
            </Show>
          </div>

          <div className={`flex-grow`}>
            <Content container={container} />
            <ReactionButtons
              key={container.id + 'reactions'}
              standalone={container.id === focusId}
              event={container.event}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Note;
