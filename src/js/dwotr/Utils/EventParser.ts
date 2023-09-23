import Key from "@/nostr/Key";
import { ID, UID } from "@/utils/UniqueIds";
import { Event } from "nostr-tools";



export class EventTag {

  name: string = '';
  source: Array<string> = [];
  valid: boolean = true;

}

export class PTagContact extends EventTag {
  hex: string = '';
  id: UID = 0;
  relayUrl?: string;
  petName?: string;

  static parse(tag: Array<string>) : PTagContact {
    let p = new PTagContact();
    p.name = tag[0];
    p.source = tag;
    p.hex = Key.toNostrHexAddress(tag[1]) as string; // Convert to hex;
    if(!p.hex) {
      p.valid = false;
      return p;    
    }

    p.id = ID(p.hex);
    p.relayUrl =tag.length > 2 ? tag[2] : undefined;
    p.petName = tag.length > 3 ? tag[3] : undefined;
    return p;
  }
}


export class EventMetadata {
  id: UID = 0;
  hex: string = '';
  authorId: UID = 0;
  source?: Event;
  valid: boolean = true;

  static parse(event: Event) {
    let m = new EventMetadata();
    m.source = event;
    m.id = ID(event.id);
    m.hex = Key.toNostrHexAddress(event.pubkey) as string; // Convert to hex;
    if(!m.hex) {
      m.valid = false;
    } else {
    m.authorId = ID(m.hex);
    }
    return m;
  }
}

export class EventParser {


    static parseTags(event: Event) {
        let p: Set<string> = new Set();
        let e: Set<string> = new Set();
        let c: string | undefined;
        let d: string | undefined;
        let v: string | undefined;
    
        if (event.tags) {
          for (const tag of event.tags) {
            switch (tag[0]) {
              case 'p': // Subject is a pubkey (Key) Optional, Multiple
                p.add(tag[1]);
                break;
              case 'e': // Subject is an entity (Entity) Optional, Multiple
                e.add(tag[1]);
                break;
              case 'c': // Context
                c = tag[1];
                break;
              case 'd': // The unique identifier of the claim, d = target[hex-address|v|context
                d = tag[1];
                break;
              case 'v': // The value of the claim
                v = tag[1];
                break;
            }
          }
        }
        return { p, e, c, d, v };
      }

      static parseTagsArrays(event: Event) {
        let p: Array<Array<string>> = [];
        let e: Array<Array<string>> = [];
        let c: string | undefined;
        let d: string | undefined;
        let v: string | undefined;
    
        if (event.tags) {
          for (const tag of event.tags) {
            switch (tag[0]) {
              case 'p': // Subject is a pubkey (Key) Optional, Multiple
                p.push(tag);
                break;
              case 'e': // Subject is an entity (Entity) Optional, Multiple
                e.push(tag);
                break;
              case 'c': // Context
                c = tag[1];
                break;
              case 'd': // The unique identifier of the claim, d = target[hex-address|v|context
                d = tag[1];
                break;
              case 'v': // The value of the claim
                v = tag[1];
                break;
            }
          }
        }
        return { p, e, c, d, v };
      }



      // static async deserialize(content: string): Promise<{ content: string, success: boolean, error: any}> {

      
      static async descrypt(content: string): Promise<{ content: string, success: boolean, error: any}> {
        let success = true;
        let error: any = null;
        try {
            content = await Key.decrypt(content);
        } catch (e) {
            //console.log('failed to parse your block list', content, event);
            success = false;
            error = e;
        }
    
        return { content, success, error };
      }

}