import { Event, getEventHash, getSignature } from 'nostr-tools';
import PubSub, { Unsubscribe } from '../../nostr/PubSub';
import Relays from '../../nostr/Relays';
import { EdgeRecord, EntityType } from '../model/Graph';
import Key from '../../nostr/Key';
import getRelayPool from '@/nostr/relayPool';
import eventManager from '../EventManager';

export type OnEvent = (event: Event, afterEose: boolean, url: string | undefined) => void;

export const Trust1Kind: number = 32010;
export const MuteKind: number = 10000;

export interface EntityItem {
  pubkey: string;
  entityType: EntityType;
}

class WOTPubSub {
  unsubs = new Map<string, Set<string>>();


  subscribeTrust(authors: string[] | undefined, since: number | undefined, cb: OnEvent): Unsubscribe {
    let relays = Relays.enabledRelays();

    let filter = {
      kinds: [Trust1Kind, MuteKind],
      authors,
      since,
    };


    const unsub = getRelayPool().subscribe(
      [filter],
      relays,
      (event: Event, afterEose: boolean, url: string | undefined) => {
        setTimeout(() => {
          cb(event, afterEose, url);
        }, 0);
      },
      0,
      undefined,
      {
        // Options
        // enabled relays
       defaultRelays: Relays.enabledRelays(),
      },
    );

    return unsub;
  }


  publishTrust(
    entityPubkey: string,
    val: number,
    content: string | undefined,
    context: string | undefined,
    entityType: EntityType,
    timestamp?: number,
  ) {
    let event = eventManager.createTrustEvent(entityPubkey, val, content, context, entityType, timestamp) as Event;

    this.sign(event);

    console.log("Publishing trust event", event);

    PubSub.publish(event);
  }



  // Publish a mute list (kind 10000)
  // NIP-51
  mute(mutes: string[]) {

    let event = {
      kind: 10000, // Mute list
      tags: mutes.map((m) => ['p', m]),
    };

    this.sign(event);

    console.log("Publishing mute event", event);

    this.publish(event);
  }


  sign(event: Partial<Event>) {
    if (!event.sig) {
        if (!event.tags) {
          event.tags = [];
        }
        event.content = event.content || '';
        event.created_at = event.created_at || Math.floor(Date.now() / 1000);
        event.pubkey = Key.getPubKey();
        event.id = getEventHash(event as Event);
        event.sig = getSignature(event as Event, Key.getPrivKey());
    }
    if (!(event.id && event.sig)) {
      console.error('Invalid event', event);
      throw new Error('Invalid event');
    }
  }

  publish(event: Event | Partial<Event>) {
    getRelayPool().publish(event, Array.from(Relays.enabledRelays()));
  }


  // // Load up profiles form the IndexedDB and subscribe to new ones
  // // Makes sure we have all the known profiles in memory
  // loadProfiles(addresses: string[]): Unsubscribe {
  //   let missingAddresses = addresses.filter((a) => !SocialNetwork.profiles.has(ID(a)));

  //   let callback = (event: Event) => {
  //     if (!event.content) return; // no content
  //     let existing = SocialNetwork.profiles.get(ID(event.pubkey));
  //     if (existing) return; // already have it

  //     let profile = JSON.parse(event.content) as any;

  //     profileManager.addProfileToMemory(profile);
  //   };

  //   return PubSub.subscribe({ kinds: [0], authors: missingAddresses }, callback, false);
  // }
}

const wotPubSub = new WOTPubSub();

export default wotPubSub;
