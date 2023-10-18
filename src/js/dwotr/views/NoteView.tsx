import View from '@/views/View.tsx';

import { RepliesFeed } from '@/dwotr/components/feed/RepliesFeed';
import { useKey } from '../hooks/useKey';
import { useEventContainer } from '../hooks/useEventContainer';
import { translate as t } from '@/translations/Translation.mjs';
import CreateNoteForm from '@/components/create/CreateNoteForm';
import ViewComponent from '../components/events/view/ViewComponent';


type NoteViewProps = {
  id?: string;
  path?: string;
};

// Show the note with the given ID in a standalone view
const NoteView = ({ id }: NoteViewProps) => {
  const { hexKey, uid } = useKey(id);

  const { container } = useEventContainer(uid);
  if(!container) return null;

  return (
    <View>
      <div className="w-full">
        <ViewComponent container={container} focusId={uid}  />
        <hr className="opacity-10 -mx-2 my-2" />
        <CreateNoteForm
          autofocus={false}
          replyingTo={container?.event}
          placeholder={t('write_your_reply')}
        />
        <hr className="opacity-10 mb-2 mt-2" />
        <RepliesFeed eventId={hexKey} />
      </div>
    </View>
  );
};

export default NoteView;
