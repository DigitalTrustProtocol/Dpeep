import { Event, Filter } from 'nostr-tools';
import { ID, STR, UID } from '@/utils/UniqueIds';
import relaySubscription from '../RelaySubscription';
import { ContactsKind, DisplayKinds, MetadataKind, RelayListKind } from '../provider';
import { Events } from '../types';
import { EventContainer } from '@/dwotr/model/ContainerTypes';
import eventManager from '@/dwotr/EventManager';
import { EmbedProcessor } from './EmbedProcessor';
import { EmbedData } from '.';
import serverManager from '@/dwotr/ServerManager';



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

  async #load(embedData: EmbedData): Promise<Events> {

    // Load profiles first, so we can get the relays the profiles uses
    let profilesLoaded = await this.#loadProfiles(embedData);

    let eventsLoaded = await this.#loadEvents(embedData);

    return [...eventsLoaded, ...profilesLoaded];
  }


  async #loadEvents(embedData: EmbedData) : Promise<Events> {

    let items = [...embedData.events.values()];

    let events: Events = [];
    let filter = { kinds: DisplayKinds } as Filter;
    filter.ids = items.filter((item) => item?.id).map((item) => item.id!) as string[]; 

    if(filter.ids.length == 0) return events;
    let relays = embedData.getEventRelays(); // Get relays embedded in the events

    // Get relays from the authors in events
    let authorIds = [...embedData.authors.keys()].map((str) => ID(str));
    let authorRelays = serverManager.relaysByAuthors(authorIds);

    if(this.logging && (relays?.length > 0 || authorRelays.length > 0))
      console.log("EmbedLoader:loadEvents:Relays:", relays, " - AuthorRelays:", authorRelays);

    // Combine relays in the events with the relays from authors in the events
    relays = [...relays, ...authorRelays];
    
    const cb = (event: Event, _afterEose: boolean, _url: string | undefined) => {
      events.push(event);
    };

    await relaySubscription.getEventsByFilter(filter, cb, relays);

    //if (this.logging) console.log('ContextLoader:loadEvents:Loading events:', filter, events);
    return events;
  }

  async #loadProfiles(embedData: EmbedData) : Promise<Events> {
    let events: Events = [];
    let items = [...embedData.authors.values()];

    let filter = { kinds: [MetadataKind, ContactsKind, RelayListKind] } as Filter; // Get all profile information and relays the profile is on
    filter.authors = items.filter((item) => item?.author).map((item) => item.author!) as string[];

    if(filter.authors.length == 0) return events;
    let relays = embedData.getAuthorRelays(); // Get profiles from relays embedded in the events

    if(this.logging && relays?.length > 0)
      console.log("EmbedLoader:loadProfiles:Relays:", relays);

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
