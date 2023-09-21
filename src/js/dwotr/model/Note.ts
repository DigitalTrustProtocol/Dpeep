import { Event } from 'nostr-tools';


export type EventRecord<K extends number = number> = Event<K> & {
    likes: number;
    reposts: number;
    replies: number;
    zaps: number;
};

// export class NoteRecord {
//     key: string = '';
//     kind: number = -1;

//     content?: string;
//     created_at: number = 0;

//     profileRefs?: string[];
//     noteRef?: string;

//     likes: number = 0;
//     reposts: number = 0;
//     replies: number = 0;
//     zaps: number = 0;

//     static fromEvent(event: Event): NoteRecord {
//         let note = new NoteRecord();
//         note.key = event.id;
//         note.kind = event.kind;
//         note.content = event.content;
//         note.created_at = event.created_at || 0;
//         note.profileRefs = event.tags?.filter((tag) => tag[0] === 'p').map((tag) => tag[1]);
//         note.noteRef = event.tags?.find((tag) => tag[0] === 'e' && tag[3] === 'root')?.[1];
//         note.likes = event.tags?.filter((tag) => tag[0] === 'e' && tag[3] === 'like').length || 0;
//         note.reposts = event.tags?.filter((tag) => tag[0] === 'e' && tag[3] === 'repost').length || 0;
//         note.replies = event.tags?.filter((tag) => tag[0] === 'e' && tag[3] === 'reply').length || 0;
//         note.zaps = event.tags?.filter((tag) => tag[0] === 'e' && tag[3] === 'zap').length || 0;
//         return note;
//     }


// }