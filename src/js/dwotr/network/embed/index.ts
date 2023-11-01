import { Event } from 'nostr-tools';
import { EmbedProps } from '@/components/embed';
import InlineMention from './nostr/InlineMention';
import NostrNip19 from './nostr/Nip19';
import NostrNpub from './nostr/NostrNpub';
import NostrNote from './nostr/NostrNote';
//import NostrNote from './nostr/NostrNote';

export type EmbedItem = {
  id?: string;
  author?: string;
  relays?: string[] | undefined;
}

export class EmbedData {



  authors: Map<string, EmbedItem> = new Map<string, EmbedItem>();
  events: Map<string, EmbedItem> = new Map<string, EmbedItem>();

  setEvent(item: EmbedItem, defaultRelay?: string) {
    if((!item?.relays || item.relays.length == 0) && defaultRelay) item.relays = [defaultRelay];
    this.events.set(item?.id || '', item);
  }

  setAuthor(item: EmbedItem, defaultRelay?: string) {
    if((!item?.relays || item.relays.length == 0) && defaultRelay) item.relays = [defaultRelay];
    this.authors.set(item?.author || '', item);
  }


  add(embedEvent: EmbedData) {
    for(let author of embedEvent.authors.values()) {
      this.setAuthor(author);
    }
    for(let event of embedEvent.events.values()) {
      this.setEvent(event);
    }
  }

  getEventRelays() : string[] {
    let relays: string[] = [];
    for(let item of this.events.values()) {
      if(!item.relays) continue;
      relays.push(...item.relays);
    }
    return relays;
  }

  getAuthorRelays() : string[] {
    let relays: string[] = [];
    for(let item of this.authors.values()) {
      if(!item.relays) continue;
      relays.push(...item.relays);
    }
    return relays;
  }

  static create(id?: string, author?: string, relays?: string | string[] | undefined) : EmbedItem {
    if(typeof relays === 'string') relays = [relays];
    return { id, author, relays: relays as string[] | undefined};
  }
}

type Embed = {
  regex: RegExp;
  component: (props: EmbedProps) => EmbedData;
  settingsKey?: string;
};

export const NostrEmbeds: Embed[] = [NostrNote, NostrNpub, NostrNip19, InlineMention];

export const ExstractEmbeds = (text: string, event: Event): EmbedData => {
  let embedData = new EmbedData();

  let lines = text.split('\n');

  for (let embed of NostrEmbeds) {
    for (const line of lines) {
      const matchs = line.match(embed.regex);
      if(matchs && matchs.length) {
        for(const match of matchs) {
          embedData.add(embed.component({ match, event, index: 0, key: '0' }));
        }
      }
    }
  }

  return embedData;
};

export default Embed;
