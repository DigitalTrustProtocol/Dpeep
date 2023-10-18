// import { useMemo } from 'react';
// import { Link } from 'preact-router';

// import Key from '../../../nostr/Key';

// import Avatar from './Avatar';
// import Show from '@/components/helpers/Show';
// import Name from './Name';
// import RelativeTime from '@/components/RelativeTime';
// import EventDropdown from '@/components/events/EventDropdown';
// import { NoteContainer } from '@/dwotr/model/DisplayEvent';
// import { BECH32 } from '@/utils/UniqueIds';
// import { authorDates } from './inline/InlineAuthor';

// type Props = {
//   container: NoteContainer;
//   fullWidth?: boolean;
//   isQuote?: boolean;
//   standalone?: boolean;
//   setTranslatedText?: any;
//   isPreview?: boolean;
// };

// const Author = ({ container, fullWidth, isQuote, standalone, setTranslatedText, isPreview }: Props) => {
  
//   const { time, dateStr, timeStr } = useMemo(
//     () => authorDates(container?.event!.created_at),
//     [container?.event!.created_at],
//   );
//   const authorId = container!.authorId!;

//   return (
//     <div className="flex items-center gap-2">
//       <Show when={fullWidth}>
//         <Avatar authorId={container!.authorId!} isQuote={isQuote} standalone={standalone} />
//       </Show>
//       <div className="flex flex-col">
//         <div>
//           <Link href={`/${BECH32(container.authorId!, 'npub')}`} className="font-bold">
//             <Name id={container.authorId!} />
//           </Link>
//           <small className="text-neutral-500">
//             <span className="mx-2">·</span>
//             <Link
//               href={`/${BECH32(container?.id, 'note')}`}
//               className="tooltip"
//               data-tip={`${dateStr} ${timeStr}`}
//             >
//               <RelativeTime date={time} />
//             </Link>
//           </small>
//         </div>
//       </div>
//       <Show when={!isQuote && !isPreview}>
//         <div className="flex-1 flex items-center justify-end">
//           <EventDropdown id={container!.event!.id} event={container!.event} onTranslate={setTranslatedText} />
//         </div>
//       </Show>
//     </div>
//   );
// };

// export default Author;
