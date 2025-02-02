// import { Event } from 'nostr-tools';
// import { getNostrTime, toNostrUTCstring } from '../Utils';
// import embedLoader from './embed/EmbedLoader';
// import { FeedOption } from './provider';
// import relaySubscription from './RelaySubscription';
// import { first } from 'hurdak';
// import { IEventProvider } from './types';

// export class RelayEventProvider implements IEventProvider {
//   logging = false;

//   buffer: Array<Event> = [];
//   subId: number = -1;

//   feedOptions: FeedOption;

//     constructor(_feedOptions: FeedOption) {
//         this.feedOptions = _feedOptions;
//     }


//   map(_feedOptions?: FeedOption) : void {

//     if (this.subId != -1) return; // Already subscribed

//     if (_feedOptions)
//         this.feedOptions = { ...this.feedOptions, ..._feedOptions };

//     let since = (this.feedOptions.filter.since || getNostrTime() - 1) + 1; // Ensure is that only the new events are loaded

//     let options = {
//       filter: { ...this.feedOptions.filter, since, until: undefined, limit: undefined },
//       onEvent: (event: Event, afterEose: boolean, relayUrl: string) => {
//         // The event has been added to eventHandler memory, but not yet to the buffer
//         // if(this.seen.has(ID(event.id))) return; // Filter out events that have already been seen
//         // this.seen.add(ID(event.id));
//         if (this.feedOptions.filterFn?.(event) === false) return; // Filter out events that don't match the filterFn, undefined means match

//         embedLoader.resolve([event]).then(() => {
//           this.buffer.push(event);
//         });

//         this.feedOptions.onEvent?.(event, afterEose, relayUrl);
//       },
//       maxDelayms: 0,
//       onClose: (subId: number) => {
//         if (this.logging) console.log('RelayEventProvider:map:onClose', subId);
//         this.feedOptions.onClose?.(subId);
//       },
//     } as FeedOption;

//     if (this.logging)
//       console.log(
//         'RelayEventProvider:map',
//         ' - Since:',
//         toNostrUTCstring(since),
//         ' - Options:',
//         options,
//       );

//     this.subId = relaySubscription.map(options);
//   }

//   off(): void {
//     relaySubscription.off(this.subId);
//     this.subId = -1;
//   }

//   // Unsubscribe
//   unmount(): void {
//     this.off();
//   }

//   count() : number {
//     return this.buffer.length;
//   }

//   take(n: number): Event[] {
//     return this.buffer.splice(0, n) || [];
//   }

//   peek() {
//     return this.buffer[0];
//   }

//   pop() {
//     return first(this.take(1));
//   }


// }
