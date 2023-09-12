import Key from "@/nostr/Key";
import { Event } from "nostr-tools";

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
        let p: Array<string> = [];
        let e: Array<string> = [];
        let c: string | undefined;
        let d: string | undefined;
        let v: string | undefined;
    
        if (event.tags) {
          for (const tag of event.tags) {
            switch (tag[0]) {
              case 'p': // Subject is a pubkey (Key) Optional, Multiple
                p.push(tag[1]);
                break;
              case 'e': // Subject is an entity (Entity) Optional, Multiple
                e.push(tag[1]);
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