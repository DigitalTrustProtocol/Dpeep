import { Event } from 'nostr-tools';
import { EmbedProps } from '@/components/embed';
import { UID } from '@/utils/UniqueIds';
import InlineMention from './nostr/InlineMention';
import NostrNip19 from './nostr/Nip19';
import NostrNpub from './nostr/NostrNpub';
//import NostrNote from './nostr/NostrNote';

export class EmbedData {
  authors: Set<UID> = new Set<UID>();
  events: Set<UID> = new Set<UID>();
  relays: Map<UID, string> = new Map<UID, string>(); // UID (event|profile) -> Relay url string


  add(embedEvent: EmbedData) {
    for (let author of embedEvent.authors) {
      this.authors.add(author);
    }
    for (let event of embedEvent.events) {
      this.events.add(event);
    }
  }
}

type Embed = {
  regex: RegExp;
  component: (props: EmbedProps) => EmbedData;
  settingsKey?: string;
};

export const NostrEmbeds: Embed[] = [NostrNpub, NostrNip19, InlineMention];

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
