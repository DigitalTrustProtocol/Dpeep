import { Event, Filter } from 'nostr-tools';
import { ID, STR, UID } from '@/utils/UniqueIds';
import relaySubscription from '../RelaySubscription';
import { DisplayKinds, MetadataKind } from '../WOTPubSub';
import { Events } from '../types';
import { EventContainer } from '@/dwotr/model/ContainerTypes';
import eventManager from '@/dwotr/EventManager';
import { EmbedProcessor } from './EmbedProcessor';
import { EmbedData, EmbedItem } from '.';



export class EmbedLoader {
  logging = true;

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

    if(this.logging)
      console.log("EmbedLoader:resolve:Loading context for events:", events.length, events);
    // The number of events should not be more than between 10-50, so we can load all context in one go
    if (events.length > 50) throw new Error('Too many events to load context for');

    for (let i = 0; i < 3; i++) {
      if(this.logging)
        console.log("EmbedLoader:resolve:Processing embeds", "Iteration:", i);

      let embeds = this.#processEmbeds(events);
      if (embeds.authors.size == 0 && embeds.events.size == 0) return;
      if(this.logging)
        console.log("EmbedLoader:resolve:Embeds", embeds);

      events = await this.#load(embeds);
      if(this.logging)
        console.log("EmbedLoader:resolve:Loaded", events);
    }
  }


  #processEmbeds(events: Events) : EmbedData {
    let containers = events.map((event) => eventManager.getContainerByEvent(event) as EventContainer).filter((c) => c) || [];

    let embeds = new EmbedProcessor();
    embeds.process(containers);
    return embeds;
  }

  async #load(embeds: EmbedData): Promise<Events> {
    let result: Events = [];
    // Loading missing, can generate more items
    result.concat(await this.#loadEvents(embeds));
    result.concat(await this.#loadProfiles(embeds));

    return result;
  }


  async #loadEvents(embeds: EmbedData) : Promise<Events> {

    let items = [...embeds.events.values()];

    let events: Events = [];
    let filter = { kinds: DisplayKinds } as Filter;
    filter.ids = items.filter((item) => item?.id).map((item) => item.id!) as string[]; 

    if(filter.ids.length == 0) return events;
    let relays = embeds.getEventRelays();
    
    const cb = (event: Event, _afterEose: boolean, _url: string | undefined) => {
      events.push(event);
    };

    await relaySubscription.getEventsByFilter(filter, cb, relays);

    if (this.logging) console.log('ContextLoader:loadEvents:Loading events:', filter, events);
    return events;
  }

  async #loadProfiles(embeds: EmbedData) : Promise<Events> {
    let events: Events = [];
    let items = [...embeds.authors.values()];

    let filter = { kinds: [MetadataKind] } as Filter;
    filter.authors = items.filter((item) => item?.author).map((item) => item.author!) as string[];

    if(filter.authors.length == 0) return events;
    let relays = embeds.getAuthorRelays();

    const cb = (event: Event, _afterEose: boolean, _url: string | undefined) => {
      events.push(event);
    };

    await relaySubscription.getEventsByFilter(filter, cb, relays);

    if (this.logging)
      console.log('ContextLoader:loadProfiles:Loading profiles:', filter, events);

    return events;
  }

}

const embedLoader = new EmbedLoader();
export default embedLoader;
