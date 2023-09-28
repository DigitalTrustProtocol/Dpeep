import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import { EventParser } from './Utils/EventParser';
import Key from '@/nostr/Key';
import wotPubSub, { MuteKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import localState from '@/state/LocalState';
import EventCallbacks from './model/EventCallbacks';

const MUTE_STORE_KEY = 'Mutes';

// Mutes that are only from the logged in user
class MuteManager {
  profileMutes = new Set<UID>();
  noteMutes = new Set<UID>();
  privateMutes = new Set<UID>(); // Covers both profile and note mutes, as it dosn't matter if the key is a profile or note

  timestamp = 0;

  callbacks = new EventCallbacks(); // Callbacks to call when the mutes change

  // Is the key muted?
  isMuted(id: UID): boolean {
    return this.profileMutes.has(id) || this.privateMutes.has(id) || this.noteMutes.has(id);
  }

  // Mute the public key (hex string) using the logged in user as the muter
  async onMute(
    id: UID,
    isMuted: boolean = true,
    isPrivate: boolean = false,
    isNote: boolean = false,
  ) {
    if (isMuted) {
      if (isPrivate) this.privateMutes.add(id);
      else if (isNote) this.noteMutes.add(id);
      else this.profileMutes.add(id);
    } else {
      this.profileMutes.delete(id);
      this.privateMutes.delete(id);
      this.noteMutes.delete(id);
    }

    this.callbacks.dispatch(id, isMuted);

    let event = await muteManager.createEvent();
    this.save(event);
    wotPubSub.publish(event);
  }

  async addMutes(event: Event) {
    let { p, e } = EventParser.parseTags(event); // Parse the tags from the event and get the mutes in p and e, ignore other tags

    this.profileMutes = new Set([...p].map(ID));
    this.noteMutes = new Set([...e].map(ID));

    let privateList = [];
    if (event.pubkey === Key.getPubKey()) {
      let { content, success } = await EventParser.descrypt(event.content || '');
      if (success) {
        privateList = JSON.parse(content) || [];
      }
    }

    this.privateMutes = new Set(privateList.map(ID));

    this.callbacks.dispatchAll(this.isMuted);
  }

  async handle(event: Event) {
    if (Key.getPubKey() !== event.pubkey) return; // Only handle events from the logged in user

    if (event.created_at <= this.timestamp) return; // Ignore old events

    this.timestamp = event.created_at;

    await this.addMutes(event);

    this.save(event);
  }

  save(event: Event | Partial<Event>) {
    localState.get(MUTE_STORE_KEY).put(JSON.stringify(event));
  }

  load() {
    localState.get(MUTE_STORE_KEY).once((muteEvent) => {
      if (!muteEvent) return;

      try {
        const event = JSON.parse(muteEvent);
        this.handle(event);
      } catch (e) {
        // ignore
      }
    });
  }

  async createEvent(): Promise<Partial<Event>> {
    let deltaPublicKeys = [...this.profileMutes].filter(
      (id) => !this.privateMutes.has(id) && !this.noteMutes.has(id),
    );

    let pTags = deltaPublicKeys.map((id) => ['p', STR(id)]);
    let eTags = [...this.noteMutes].map((id) => ['e', STR(id)]);

    let privateList = [...this.privateMutes].map(STR);

    let content = privateList.length > 0 ? await Key.encrypt(JSON.stringify(privateList)) : '';

    const event = {
      kind: MuteKind,
      content: content,
      created_at: getNostrTime(),
      tags: [...pTags, ...eTags],
    };
    return event;
  }

  // dispatchAll() {
  //   for (const id of this.callbacks.keys()) {
  //     this.callbacks.dispatch(id, this.isMuted(id));
  //   }
  // }

}

const muteManager = new MuteManager();
export default muteManager;
