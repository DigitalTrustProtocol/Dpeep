import { Event, Filter } from 'nostr-tools';
import { STR, UID } from '@/utils/UniqueIds';
import relaySubscription from '../RelaySubscription';
import { DisplayKinds, MetadataKind } from '../WOTPubSub';
import { Events } from '../types';
import { EventContainer } from '@/dwotr/model/ContainerTypes';
import eventManager from '@/dwotr/EventManager';
import { EmbedProcessor } from './EmbedProcessor';
import { EmbedData } from '.';



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

    // The number of events should not be more than between 10-50, so we can load all context in one go
    //if (events.length > 100) throw new Error('Too many events to load context for');

    for (let i = 0; i < 3; i++) {
      if(this.logging)
        console.log("EmbedLoader:resolve", "Iteration:", i);

      let embeds = this.#processEmbeds(events);
      if (embeds.authors.size == 0 && embeds.events.size == 0) return;
      if(this.logging)
        console.log("EmbedLoader:resolve:Found", "-Events", embeds.events.size, "-Authors:", embeds.authors.size, embeds);

      events = await this.#load(embeds);

      let notLoaded = this.#notLoaded(events, embeds);
      // Store the not loaded items in the embeds object, so we can try to load them again later?!?
      // Maybe show a warning to the user that some items could not be loaded
      // Make a visible list somewhere of the items that could not be loaded

      if(this.logging)
        console.log("EmbedLoader:resolve:Loaded", "-New events:", events.length, events, "-Not loaded count:", notLoaded.events.size + notLoaded.authors.size, " -Not Loaded Embeds", notLoaded);
    }
  }

  // Returns a new EmbedData object with only the items that were not loaded, because they were not found on the relays or timed out
  #notLoaded(events: Events, embedData: EmbedData) : EmbedData {
    let result = new EmbedData();

    let eventIds = new Set(events.map((e) => e.id!) as string[]);

    for(let [key, value] of embedData.events) {
      if(!eventIds.has(key)) {
        result.events.set(key, value);
      }
    }

    for(let [key, value] of embedData.authors) {
      if(!eventIds.has(key)) {
        result.authors.set(key, value);
      }
    }

    return result;
  }


  #processEmbeds(events: Events) : EmbedData {
    let containers = events.map((event) => eventManager.getContainerByEvent(event) as EventContainer).filter((c) => c) || [];

    let embeds = new EmbedProcessor();
    embeds.process(containers);
    return embeds;
  }

  async #load(embeds: EmbedData): Promise<Events> {

    let eventsLoaded = await this.#loadEvents(embeds);
    let profilesLoaded = await this.#loadProfiles(embeds);

    return [...eventsLoaded, ...profilesLoaded];
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

    //if (this.logging) console.log('ContextLoader:loadEvents:Loading events:', filter, events);
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

    //if (this.logging) console.log('ContextLoader:loadProfiles:Loading profiles:', filter, events);

    return events;
  }

}

const embedLoader = new EmbedLoader();
export default embedLoader;
