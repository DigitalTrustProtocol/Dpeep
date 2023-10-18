import { useState } from 'preact/hooks';

import Show from '@/components/helpers/Show';
import HyperText from '@/components/HyperText';
import { translate as t } from '@/translations/Translation.mjs';
import Helpers from '@/utils/Helpers';

import useVerticeMonitor from '@/dwotr/hooks/useVerticeMonitor';
import { NoteContainer } from '@/dwotr/model/DisplayEvent';

const MSG_TRUNCATE_LENGTH = 500;
const MSG_TRUNCATE_LINES = 8;

type Props = {
  container: NoteContainer;
  translatedText?: string;
};

const Content = ({ container, translatedText }: Props) => {
  const [doTruncate, setDoTruncate] = useState(true);

  const wot = useVerticeMonitor(
    container ? container.id : 0,
    ['badMessage', 'neutralMessage', 'goodMessage'],
    '',
  ) as any;

  let event = container?.event!;

  const emojiOnly = event.content?.length === 2 && Helpers.isEmoji(event.content);

  const { text, isTooLong } = processText(event.content, doTruncate);

  return (
    <div className="flex flex-col">
      <Show when={text?.length > 0}>
        <div
          className={`preformatted-wrap pb-1 ${emojiOnly && 'text-3xl'} 
          ${wot?.option}`}
        >
          <HyperText event={event}>{text}</HyperText>
          <Show when={translatedText}>
            <p>
              <i>{translatedText}</i>
            </p>
          </Show>
        </div>
      </Show>
      <Show when={doTruncate && isTooLong()}>
        <a
          className="text-sm link mb-2"
          onClick={(e) => {
            e.preventDefault();
            setDoTruncate(!doTruncate);
          }}
        >
          ... {t(`show_${doTruncate ? 'more' : 'less'}`)}
        </a>
      </Show>
    </div>
  );
};

export default Content;

export const processText = (content: string, doTruncate: boolean = false) => {
  let text = content || '';

  const attachments = [] as any[];
  const urls = text.match(/(https?:\/\/[^\s]+)/g);
  if (urls) {
    urls.forEach((url) => {
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        console.log('invalid url', url);
        return;
      }
      if (parsedUrl.pathname.toLowerCase().match(/\.(jpg|jpeg|gif|png|webp)$/)) {
        attachments.push({ type: 'image', data: `${parsedUrl.href}` });
      }
    });
  }

  if (doTruncate) {
    text = text.length > MSG_TRUNCATE_LENGTH ? `${text.slice(0, MSG_TRUNCATE_LENGTH)}...` : text;

    const lines = text.split('\n');
    text =
      lines.length > MSG_TRUNCATE_LINES
        ? `${lines.slice(0, MSG_TRUNCATE_LINES).join('\n')}...`
        : text;
  }

  function isTooLong() {
    return (
      attachments?.length > 1 ||
      content?.length > MSG_TRUNCATE_LENGTH ||
      content.split('\n').length > MSG_TRUNCATE_LINES
    );
  }
  return { text, attachments, isTooLong };
};
