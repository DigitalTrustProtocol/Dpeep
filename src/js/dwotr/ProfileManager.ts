import { Event, Filter } from 'nostr-tools';
import Events from '../nostr/Events';
import SocialNetwork from '../nostr/SocialNetwork';
import Key from '../nostr/Key';
import { throttle } from 'lodash';
import Identicon from 'identicon.js';
import OneCallQueue from './Utils/OneCallQueue';
import storage from './Storage';
import { hexName } from './Utils';
import { ProfileEvent } from './network/ProfileEvent';
import FuzzySearch from '@/nostr/FuzzySearch';
import { ID, STR, UID } from '@/utils/UniqueIds';
import EventCallbacks from './model/EventCallbacks';
import ProfileRecord, { ProfileMemory } from './model/ProfileRecord';
import blockManager from './BlockManager';
import followManager from './FollowManager';
import wotPubSub, { FeedOptions } from './network/WOTPubSub';
import relaySubscription from './network/RelaySubscription';
import { EPOCH } from './Utils/Nostr';

type OnProfile = (profile: ProfileMemory, state: any) => void;

class ProfileManager {
  loaded: boolean = false;
  #saveQueue = new Map<number, ProfileRecord>();
  #saving: boolean = false;
  history: { [key: string]: any } = {};

  logging: boolean = true;

  // Limits the relay requests to one per profile
  relayProfileRequest = new Set<UID>();
  
  // Controls the callbacks for when a profile is updated
  onEvent: EventCallbacks = new EventCallbacks();
 

  metrics = {
    TableCount: 0,
    TotalMemory: 0,
    Loaded: 0,
    Saved: 0,
  };

  //--------------------------------------------------------------------------------
  // Saves profile(s) to IndexedDB
  //--------------------------------------------------------------------------------
  saveBulk = throttle(() => {
    if (this.#saving) {
      this.saveBulk(); // try again later
      return;
    }

    this.#saving = true;

    const queue = [...this.#saveQueue.values()];
    this.#saveQueue = new Map<number, ProfileRecord>();

    this.metrics.Saved += queue.length;

    storage.profiles.bulkPut(queue).finally(() => {
      this.#saving = false;
    });
  }, 500);

  async init() {
    this.loaded = true;
  }

  //--------------------------------------------------------------------------------
  // Mapping profiles from relay server
  mapProfiles(profileIds: Set<UID> | Array<UID>, since?: number, kinds?: Array<number>) {
    let latestSync: Array<UID> = [];
    let fullSync: Array<UID> = [];

    for (const id of profileIds) {
      if (!id) continue;
      let profile = this.getMemoryProfile(id);

      if (profile.syncronized) {
        latestSync.push(id);
      } else {
        fullSync.push(id);
      }
    }

    if (fullSync.length > 0) {
      if (this.logging) console.log('Full sync of profiles:', this.#names(fullSync));

      let fullSyncDone = false;
      let onEose = (allEosed: boolean, relayUrl: string, minCreatedAt: number) => {
        if (!allEosed || fullSyncDone) return false;
        for (const id of fullSync) {
          let profile = this.getMemoryProfile(id);
          profile.syncronized = true;
          //profile.relayLastUpdate = minCreatedAt;
          this.save(profile);
        }
        fullSyncDone = true;
      };
      relaySubscription.mapAuthors(fullSync, EPOCH, kinds, undefined, onEose); // Full sync
    }

    if (latestSync.length > 0) {
      if (this.logging) console.log('Latest sync of profiles:', this.#names(latestSync));
      relaySubscription.mapAuthors(latestSync, since, kinds); // Latest sync
    }
  }

  #names(ids: Set<UID> | Array<UID>): Array<string> {
    let names: Array<string> = [];
    for (const id of ids) {
      let profile = this.getMemoryProfile(id);
      names.push(profile.name);
    }
    return names;
  }

  // ---------------------------------------------------------------------------------------------


  //--------------------------------------------------------------------------------
  // Requests a profile from the API
  //--------------------------------------------------------------------------------
  once(profileId: UID) {
    if(this.relayProfileRequest.has(profileId)) return; // Already requested
    this.relayProfileRequest.add(profileId);
    
    let onClose = () => {
      if (this.logging) console.log('ProfileManager:profileRequest:close', STR(profileId));
      this.relayProfileRequest.delete(profileId); // Cleanup
    };

    let options = {
      filter: {
        authors: [STR(profileId)],
        kinds: [0],
        since: EPOCH,
      } as Filter,
      onClose,
    } as FeedOptions;

    relaySubscription.once(options, 3000);
  }

  //--------------------------------------------------------------------------------
  // Validates a profile object
  // TODO: Add more validation
  // Returns true if the profile seems valid and not corrupted or empty
  //--------------------------------------------------------------------------------
  validateProfile(profile: any) {
    if (!profile) return false;

    return true;
  }

  //--------------------------------------------------------------------------------
  // Fetches a profile from the API
  //--------------------------------------------------------------------------------
  async fetchProfile(hexPub: string) {
    try {
      let url = `https://api.iris.to/profile/${hexPub}`;

      let { data } = await OneCallQueue<any>(url, async () => {
        // Fetch the resource and return the response body as a JSON object
        let res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        if (res && res.status === 200) {
          let data = await res.json();
          return { res, data };
        }
        return { res, data: undefined };
      });

      return data;
    } catch (error: any) {
      console.log('There was a problem with the fetch operation: ' + error.message);
    }
  }

  //--------------------------------------------------------------------------------
  // Fetches profiles from the API and saves them to IndexedDB with a callback
  // to update the UI as they come in. Errors like 500 can hold up the whole batch, therefore
  // we don't want to wait for the whole batch to complete before updating the UI.
  //--------------------------------------------------------------------------------
  fetchProfiles(hexPubs: string[], cb: (profile: any) => void) {
    if (!hexPubs || hexPubs.length === 0) return;

    const fetch = async (key: string) => {
      const profile = await this.fetchProfile(key);
      if (!profile) return;
      if (profileManager.validateProfile(profile)) {
        Events.handle(profile);
        cb(profile);
      }
    };

    for (const hexPub of hexPubs) {
      fetch(hexPub);
    }
  }

  //--------------------------------------------------------------------------------
  // Loading profiles from IndexedDB
  //--------------------------------------------------------------------------------
  async loadProfiles(addresses: Set<string>): Promise<ProfileMemory[]> {
    let list = (await storage.profiles
      .where('key')
      .anyOf(Array.from(addresses))
      .toArray()) as ProfileMemory[];
    return ProfileMemory.setIDs(list);
  }

  //--------------------------------------------------------------------------------
  // Loading a profile from IndexedDB
  //--------------------------------------------------------------------------------
  async loadProfile(hexPub: string): Promise<ProfileMemory | undefined> {
    let profile = await OneCallQueue<ProfileMemory>(`loadProfile${hexPub}`, async () => {
      return ProfileMemory.setID((await storage.profiles.get({ key: hexPub })) as ProfileMemory);
    });

    if (profile?.isDefault) {
      return undefined;
    }

    return profile;
  }

  //--------------------------------------------------------------------------------
  // Loading or fetching a profile from IndexedDB or the API or memory
  //--------------------------------------------------------------------------------
  async getProfile(address: string): Promise<ProfileMemory> {
    let result = await this.getProfiles([address]);
    return result?.[0];
  }

  //--------------------------------------------------------------------------------
  // Loading or fetching profiles from IndexedDB or the API or memory
  //--------------------------------------------------------------------------------
  async getProfiles(addresses: string[]): Promise<Array<ProfileMemory>> {
    if (!addresses || addresses.length === 0) return [];

    let profiles: Array<any> = [];
    let dbLookups: Array<string> = [];
    let authors: Array<string> = [];

    // First load from memory
    for (const address of addresses) {
      if (!address) continue;
      const hexPub = Key.toNostrHexAddress(address) as string;
      const profile = SocialNetwork.profiles.get(ID(hexPub)); // ID() makes sure to register the address with an ID in the Ids map if it's not already there
      if (profile) {
        profiles.push(profile);
      } else {
        dbLookups.push(hexPub);
      }

      authors.push(hexPub);
    }

    if (dbLookups.length > 0) {
      let lookupSet = new Set(dbLookups);

      console.timeStamp('Loading profiles from IndexedDB');
      console.time('LoadDB');

      // Then load from DB
      const dbProfiles = await this.loadProfiles(lookupSet);

      if (dbProfiles && dbProfiles.length > 0) {
        profiles = profiles.concat(dbProfiles);
        for (const profile of dbProfiles) {
          if (profile) lookupSet.delete(profile.key);
        }
      }

      console.timeEnd('LoadDB');

      // Then load from API
      // if (lookupSet.size > 0 && lookupSet.size <= 100) {
      //   let list = Array.from(lookupSet).map((a) => a);

      // }

      // Fill in default profile for missing profiles
      for (const hexPub of lookupSet) {
        let profile = this.createDefaultProfile(hexPub);
        SocialNetwork.profiles.set(ID(profile.key), profile);
        profiles.push(profile); // Fill in default profile with animal names
      }

      // Then save to memory
      for (const profile of profiles) {
        if (!profile || !this.isProfileNewer(profile)) continue;

        this.addProfileToMemory(profile);
      }
    }

    // Subscriptions on relays have been removed and should be called elsewhere

    return profiles;
  }

  save(profile: ProfileMemory) {
    if (profile?.isDefault || profile?.isDefault == undefined) return; // don't save default profiles
    this.#saveQueue.set(profile.id, profile);
    this.saveBulk(); // Save to IndexedDB in bulk by throttling
  }

  async loadAllProfiles() {
    //console.time('Loading profiles - list');
    const list = (await storage.profiles.toArray()) as ProfileMemory[];

    this.metrics.Loaded += list.length;

    for (const p of list) {
      this.addProfileToMemory(p);
    }

    //console.timeEnd('Loading profiles - list');
    //console.log('Loaded profiles from IndexedDB - ' + list.length + ' profiles');
  }

  sanitizeProfile(p: any, hexPub: string, isBlocked = false): ProfileMemory {
    if (!p) return this.createDefaultProfile(hexPub);

    // Make sure we have a name
    let name =
      p.name || p.username || p.display_name || p.displayName || p.nip05 || p.lud16 || p.lud06; // Find a name
    name = p.name?.trim().slice(0, 100) || ''; // Trim and limit to 100 chars

    // Make sure we have a display name
    let display_name = (p.display_name || p.displayName)?.trim().slice(0, 200);

    // Make sure that we don't store large values
    display_name = p.display_name?.trim().slice(0, 200);

    let about = p.about?.trim().slice(0, 10000);
    let picture = p.picture?.trim().slice(0, 4096);
    let banner = p.banner?.trim().slice(0, 4096);
    let website = p.website?.trim().slice(0, 4096);
    let nip05 = p.nip05?.trim().slice(0, 4096);
    let lud06 = p.lud06?.trim().slice(0, 4096);
    let lud16 = p.lud16?.trim().slice(0, 4096);

    let profile = {
      ...p,
      key: hexPub,
      name,
      display_name,
      about,
      picture,
      banner,
      website,
      nip05,
      lud06,
      lud16,
      isDefault: false,
    } as ProfileMemory;

    if (isBlocked) {
      // If blocked, then remove all personal info
      profile = new ProfileMemory(ID(hexPub));
      profile.key = hexPub;
      profile.name = name;
      profile.display_name = display_name;
    }

    return profile;
  }

  createDefaultProfile(hexPub: string): ProfileMemory {
    let profile = new ProfileMemory(ID(hexPub));
    profile.key = hexPub;
    profile.name = hexName(hexPub);
    profile.isDefault = true;
    return profile;
  }

  // getDefaultProfile(id: number) : ProfileMemory {
  //   //if (!id) return this.createDefaultProfile("");
  //   const profile = SocialNetwork.profiles.get(id);
  //   if (profile) return profile;
  //   return this.createDefaultProfile(STR(id));
  // }

  // quickProfile(address: string) {
  //   const id = ID(address);
  //   const profile = SocialNetwork.profiles.get(id);
  //   if (profile) return profile;
  //   return this.createDefaultProfile(STR(id));
  // }

  hasProfile(id: number) {
    return SocialNetwork.profiles.has(id);
  }

  getMemoryProfile(id: number): ProfileMemory {
    const profile = SocialNetwork.profiles.get(id);
    ProfileMemory.setID(profile); // Make sure the profile has an ID
    if (profile) return profile;
    return this.createDefaultProfile(STR(id) as string);
  }

  isProfileNewer(profile: ProfileMemory): boolean {
    if (!profile?.key) return false;

    const existingProfile = SocialNetwork.profiles.get(ID(profile.key));

    return (
      !existingProfile ||
      (profile.isDefault === false && profile.created_at > existingProfile.created_at)
    );
  }

  addProfileToMemory(profile: ProfileMemory) {
    if (!profile) return undefined;

    SocialNetwork.profiles.set(ID(profile.key), profile);

    FuzzySearch.add({
      key: profile.key,
      name: profile.name,
      display_name: profile.display_name,
      followers: followManager.getItem(ID(profile.key)).followedBy,
      //followers: SocialNetwork.followersByUser.get(ID(profile.key)) ?? new Set(),
    });
    return profile;
  }

  addProfileEvent(event: Event, isBlocked = false) {
    if (!event || !event.pubkey || !event.content) return undefined;

    try {
      const raw = JSON.parse(event.content);
      if (!raw) return undefined;

      raw.created_at = event.created_at; // Add the event timestamp to the profile

      let profile = this.sanitizeProfile(raw, event.pubkey, isBlocked);

      //Always save the profile to DWoTRDB
      this.save(profile); // Save to DWoTRDB

      return this.addProfileToMemory(profile); // Save to memory
    } catch (e) {
      // Remove the event from IndexedDB if it has an id wich means it was saved there
      if (event.id) {
        storage.profiles.delete(event.id);
      }
      console.error(e);
      return undefined;
    }
  }

  createImageUrl(str: string, width: number = 30, height: number = 30) {
    //if (profile && profile.picture) return profile.picture;

    const identicon = new Identicon(str, {
      width,
      height,
      format: `svg`,
    });
    return `data:image/svg+xml;base64,${identicon.toString()}`;
  }

  ensurePicture(profile: ProfileMemory): string {
    if (!profile.picture) {
      profile.picture = this.createImageUrl(profile.key);
    }
    return profile.picture;
  }

  // ---- New system ----

  callbacks = new EventCallbacks();

  subscribeMyself() {
    const myPub = Key.getPubKey();
    this.mapProfiles([ID(myPub)]);
    wotPubSub.subscribeFilter([{ '#p': [myPub], kinds: [1, 3, 6, 7, 9735] }]); // mentions, reactions, DMs
    wotPubSub.subscribeFilter([{ '#p': [myPub], kinds: [4] }]); // dms for us
    wotPubSub.subscribeFilter([{ authors: [myPub], kinds: [4] }]); // dms by us
    //Events.subscribeGroups();
  }

  async subscribeMyselfOnce(since?: number, until?: number) {
    const myPub = Key.getPubKey();
    await relaySubscription.onceAuthors([ID(myPub)], since, until);
    // wotPubSub.subscribeFilter([{ '#p': [myPub], kinds: [1, 3, 6, 7, 9735] }]); // mentions, reactions, DMs
    // wotPubSub.subscribeFilter([{ '#p': [myPub], kinds: [4] }]); // dms for us
    // wotPubSub.subscribeFilter([{ authors: [myPub], kinds: [4] }]); // dms by us
    // //Events.subscribeGroups();

    return true;
  }

  // Get the latest profile

  subscribeProfile(
    profileId: UID,
    cb: (profile: ProfileMemory) => void,
    kinds = [0],
    delay = 1000,
  ) {
    this.callbacks.addListener(profileId, cb);

    const handleEvent = (event: Event) => {
      // At this point the profile should be loaded into memory from the event
      let profile = profileManager.getMemoryProfile(profileId);

      this.callbacks.dispatch(profileId, profile);
    };

    wotPubSub.getAuthorEvent(profileId, kinds, handleEvent, delay); // delay 1 sec
  }

  // subscribe(address: string, cb: (e: any) => void): Unsubscribe {
  //   return () => {};
  //   const hexPub = Key.toNostrHexAddress(address) as string;
  //   const id = ID(hexPub);

  //   let subsciptionIndex = this.subscriptions.add(id, cb);
  //   let profile = this.getMemoryProfile(id);

  //   if (profile.isDefault) {
  //     // Check if profile is in IndexedDB
  //     this.loadProfile(hexPub).then((record) => {
  //       if (record) {
  //         // exists in DB
  //         this.subscribeCallback(record, cb);
  //       } else {
  //         // Check if profile is in API
  //         profileManager.fetchProfile(hexPub).then((data) => {
  //           // TODO verify sig
  //           if (!data) return;

  //           let eventProfile = this.addProfileEvent(data);

  //           this.subscribeCallback(eventProfile, cb);
  //         });
  //       }
  //     });
  //   }

  //   // Instantly send the profile to the callback
  //   this.subscribeCallback(profile, cb);

  //   // If not already subscribed to updates
  //   if (!this.subscriptions.hasUnsubscribe(id)) {
  //     // Then subscribe to updates via nostr relays, but only once per address
  //     let unsub = PubSub.subscribe(
  //       { kinds: [0], authors: [hexPub] },
  //       this.subscriptionCallback,
  //       false,
  //     );
  //     this.subscriptions.addUnsubscribe(id, unsub);
  //   }
  //   return () => {
  //     this.subscriptions.remove(id, subsciptionIndex);
  //   }

  // }

  subscribeCallback(profile: ProfileMemory | undefined, cb: (e: any) => void) {
    if (!profile) return;

    if (this.isProfileNewer(profile)) this.addProfileToMemory(profile);

    let mem = ProfileMemory.fromRecord(profile);

    cb(new ProfileEvent(mem));
  }

  dispatchProfile(profile: ProfileMemory) {
    if (!profile) return;

    if (this.isProfileNewer(profile)) this.addProfileToMemory(profile);

    //ProfileEvent.dispatch(ID(profile.key), profile as ProfileMemory);
    let mem = ProfileMemory.fromRecord(profile);
    let event = new ProfileEvent(mem);

    this.callbacks.dispatch(mem.id, event);
  }

  // ---- Pet names ----
  // TODO: sourceId is used for storing information about who set the pet name
  setPetNames(sourceId, petNames: Array<{ id: number; name: string }>) {
    for (const item of petNames) {
      let profile = this.getMemoryProfile(item.id);
      profile.petName = item.name;
    }
  }

  async verifyNip05Profile(profile: ProfileMemory, pubkey: string) {
    if (!profile.nip05) return false;
    // TODO verify NIP05 address
    let isValid = await Key.verifyNip05Address(profile.nip05, pubkey);

    //console.log('NIP05 address is valid?', isValid, profile.nip05, pubkey);
    profile.nip05valid = isValid;
    return isValid;
  }

  async tableCount() {
    return await storage.profiles.count();
  }

  handle(event: Event) {
    let authorId = ID(event.pubkey);
    let isBlocked = blockManager.isBlocked(authorId); // Limit the profile if its blocked
    let profile = this.addProfileEvent(event, isBlocked);
    if(profile) {
      this.onEvent.dispatch(authorId, profile); // Notify subscribers
    }
  }

  setMetadata(data: any) {
    const event = {
      kind: 0,
      content: JSON.stringify(data),
    };
    Events.publish(event);
  }

  getMetrics(): any {
    this.tableCount().then((count) => {
      this.metrics.TableCount = count;
    });
    this.metrics.TotalMemory = SocialNetwork.profiles.size;

    return this.metrics;
  }
}

const profileManager = new ProfileManager();

profileManager.init();

export default profileManager;
