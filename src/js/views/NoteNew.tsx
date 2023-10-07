import { route } from 'preact-router';

import View from '@/views/View.tsx';

import CreateNoteForm from '../components/create/CreateNoteForm';
import { translate as t } from '../translations/Translation.mjs';

const NoteNew = (props) => {
  return (
    <View>
      <div className="w-full">
        <div className="m-2">
          <CreateNoteForm
            placeholder={t('whats_on_your_mind')}
            forceAutoFocusMobile={true}
            autofocus={true}
            onSubmit={() => route('/')}
          />
        </div>
      </div>
    </View>
  );
};

export default NoteNew;
