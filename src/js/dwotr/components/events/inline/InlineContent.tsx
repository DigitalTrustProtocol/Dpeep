import { memo } from 'preact/compat';
import Show from '@/components/helpers/Show';
import HyperText from '@/components/HyperText';
import Helpers from '@/utils/Helpers';

import useVerticeMonitor from '@/dwotr/hooks/useVerticeMonitor';
import { NoteContainer } from '@/dwotr/model/DisplayEvent';
import Helmet from '@/components/events/note/Helmet';
import { processText } from '../Content';
import profileManager from '@/dwotr/ProfileManager';


type Props = {
  container: NoteContainer;
  translatedText?: string;
  showTools?: boolean;
};

const InlineContent = ({ container, translatedText, showTools = false }: Props) => {
  const wot = useVerticeMonitor(
    container ? container.id : 0,
    ['badMessage', 'neutralMessage', 'goodMessage'],
    '',
  ) as any;

  let event = container?.event!;
  const text = event.content || '';

  const emojiOnly = event.content?.length === 2 && Helpers.isEmoji(event.content);

  const ShowHelmet = () => {
    if (!showTools) return null; // Only show the helmet if we're showing tools, should only happen in the note view

    let profile = profileManager.getMemoryProfile(container.authorId!);
    let name = profile?.displayName || profile?.name || 'Unknown';
    const { text, attachments } = processText(event.content, true);

    return (<Helmet name={name} text={text} attachments={attachments} />);
  }

  return (
    <div className="flex flex-col">
      <ShowHelmet />
      <Show when={text?.length > 0}>
        <div
          className={`preformatted-wrap pb-1 ${
            emojiOnly && 'text-3xl'
          } full-width-note ${wot?.option}`}
        >
          <HyperText event={event}>{text}</HyperText>
          <Show when={translatedText}>
            <p>
              <i>{translatedText}</i>
            </p>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default memo(InlineContent);
