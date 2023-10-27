import { Event, Filter } from 'nostr-tools';
import { ID, STR, UID } from '@/utils/UniqueIds';
import relaySubscription from '../RelaySubscription';
import { DisplayKinds, MetadataKind } from '../WOTPubSub';
import { Events } from '../types';
import { EventContainer } from '@/dwotr/model/ContainerTypes';
import eventManager from '@/dwotr/EventManager';
import { EmbedProcessor } from './EmbedProcessor';
import { EmbedData } from '.';



export class EmbedLoader {
  logging = false;

  async getEventsByIdWithContext(ids: Array<UID>): Promise<Array<Event>> {
    let list = ids.map((id) => STR(id) as string);
    let events = await relaySubscription.getEventByIds(list);
    await this.resolve(events);
    return events;
  }

  // Profiles
  // Replies
  // Reactions
  // Reposts
  // Zaps

  async resolve(events: Array<Event>): Promise<void> {
    if (events.length == 0) return;

    // The number of events should not be more than between 10-50, so we can load all context in one go
    if (events.length > 50) throw new Error('Too many events to load context for');

    for (let i = 0; i < 3; i++) {
      let embeds = this.#processEmbeds(events);
      events = await this.#load(embeds);
    }
  }


  #processEmbeds(events: Events) : EmbedData {
    let containers = events.map((event) => eventManager.containers.get(ID(event.id)) as EventContainer) || [];

    let embeds = new EmbedProcessor();
    embeds.process(containers);
    return embeds;
  }

  async #load(embeds: EmbedData): Promise<Events> {
    if(embeds.authors.size == 0 && embeds.events.size == 0) return [];

    // Loading missing, can generate more items
    let notes = await this.#loadEvents(embeds.events);
    let profiles = await this.#loadProfiles(embeds.authors);

    return [...notes, ...profiles];
  }


  async #loadEvents(ids: Set<UID>) : Promise<Events> {

    let events: Events = [];
    let filter = { kinds: DisplayKinds } as Filter;
    filter.ids = [...ids.values()].map((id) => STR(id) as string);

    const cb = (event: Event, _afterEose: boolean, _url: string | undefined) => {
      events.push(event);
    };

    await relaySubscription.getEventsByFilter(filter, cb);

    if (this.logging) console.log('ContextLoader:loadEvents:Loading events:', filter, events);
    return events;
  }

  async #loadProfiles(ids: Set<UID>) : Promise<Events> {
    let events: Events = [];
    let filter = { kinds: [MetadataKind] } as Filter;
    filter.authors = [...ids.values()].map((id) => STR(id) as string);

    const cb = (event: Event, _afterEose: boolean, _url: string | undefined) => {
      events.push(event);
    };

    await relaySubscription.getEventsByFilter(filter, cb);

    if (this.logging)
      console.log('ContextLoader:loadProfiles:Loading profiles:', filter, events);

    return events;
  }

}

const embedLoader = new EmbedLoader();
export default embedLoader;
