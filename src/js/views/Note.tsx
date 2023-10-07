import { useEffect } from 'preact/hooks';
import { route } from 'preact-router';

import { EventID } from '@/utils/Hex/Hex.ts';
import View from '@/views/View.tsx';

import EventComponent from '../components/events/EventComponent';

const Note = (props) => {
  useEffect(() => {
    const noteId = new EventID(props.id).note;
    if (noteId && props.id !== noteId) {
      route(`/${noteId}`, true);
      return;
    }
  }, [props.id]);

  // let content;
  // if (props.id === 'new') {
  //   content = (
  //     <div className="m-2">
  //       <CreateNoteForm
  //         placeholder={t('whats_on_your_mind')}
  //         forceAutoFocusMobile={true}
  //         autofocus={true}
  //         onSubmit={() => route('/')}
  //       />
  //     </div>
  //   );
  // } else {
  //   content = (
  //     <EventComponent
  //       id={props.id}
  //       key={props.id}
  //       standalone={true}
  //       showRepliedMsg={true}
  //       showReplies={Infinity}
  //     />
  //   );
  // }
  return (
    <View>
      <div className="w-full">
        {' '}
        <EventComponent
          id={props.id}
          key={props.id}
          standalone={true}
          showRepliedMsg={true}
          showReplies={Infinity}
        />
      </div>
    </View>
  );
};

export default Note;
