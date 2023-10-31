// Source: https://github.com/coracle-social/coracle/blob/master/src/util/nostr.ts

import {  fromPairs, last, identity, prop, flatten, uniq } from 'ramda';
import { ensurePlural, mapVals, tryFunc, first } from 'hurdak';
import { Event } from 'nostr-tools';

export const noteKinds = [1, 30023, 1063, 9802, 1808];
export const personKinds = [0, 2, 3, 10002];
export const userKinds = personKinds.concat([10000, 30001, 30078]);

export const EPOCH = 1635724800;


// long-form posts 30023
// indexing of file headers (kind:1063)
// badge definitions (kind:30009),
// stalls and products (30017,18),
// music tracks from zapstr (31337), 
// and reports (1984)

// Highlights 9802
// https://highlighter.com/load?url=https%3A%2F%2Fblog.lopp.net%2Fhal-finney-was-not-satoshi-nakamoto%2F


// {"created_at":1698234128,
// "content":"The problem is, of course, that all of these platforms are platforms, which is to say, walled gardens that imprison readers and writers alike. Worse than that: they are fiat platforms, which means that permissionless
//  value-flows are not only absent from their DNA, they are outright impossible.",
//  "tags":[
//   ["a","30023:6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93:1680612926599"],
//   ["e","1a1fe6c838400f3347f97a9adce08c10068f3bc35a279520c911b025c387b061"],
//   ["p","6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93"],
//   ["p","6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93"],
//   ["p","b9e76546ba06456ed301d9e52bc49fa48e70a6bf2282be7a1ae72947612023dc"],
//   ["context","The problem is, of course, that all of these platforms are platforms, which is to say, walled gardens that imprison readers and writers alike. Worse than that: they are fiat platforms, which means that permissionless value-flows are not only absent from their DNA, they are outright impossible.[^2]"],
//   ["t","nostr"],
//   ["t","reading"],
//   ["t","writing"],
//   ["t","readability"],
//   ["t","highlights"],
//   ["t","pocket"],
//   ["t","instapaper"],
//   ["t","readwise"],
//   ["t","disqus"],
//   ["t","v4v"],
//   ["alt","\"The problem is, of course, that all of these platforms are platforms, which is to say, walled gardens that imprison readers and writers alike. Worse than that: they are fiat platforms, which means that permissionless value-flows are not only absent from their DNA, they are outright impossible.\"\n\nThis is a highlight created on https://highlighter.com"],["zap","6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93","wss://purplepag.es","2"],
//   ["zap","fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52","wss://purplepag.es","1"]],
//   "kind":9802,
//   "pubkey":"fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52",
//   "id":"de5b9003f3556ce22b60cdc62c07269b9b9b811761ecb752665ef923b7963b64",
//   "sig":"fcd98d9bef056d78f5db9c66c359b80a5833bfb9f8ebb45ab962ccbb4427433cc43aa71a0d2c399aaa2e5be36677b81853de19e271a0c84269069d385ac161f0"}



export class Tags {
  tags: any[];
  constructor(tags: any[]) {
    this.tags = tags.filter(identity);
  }
  static from(events: Event | Event[]) {
    return new Tags(ensurePlural(events).flatMap(prop('tags')));
  }
  static wrap(tags: any[]) {
    return new Tags(tags.filter(identity));
  }
  all() {
    return this.tags;
  }
  count() {
    return this.tags.length;
  }
  exists() {
    return this.tags.length > 0;
  }
  first() {
    return first(this.tags);
  }
  nth(i: number) {
    return this.tags[i];
  }
  last() {
    return last(this.tags);
  }
  relays() {
    return uniq(flatten(this.tags).filter(isShareableRelay));
  }
  topics() {
    return this.type('t')
      .values()
      .all()
      .map((t) => t.replace(/^#/, ''));
  }
  pubkeys() {
    return this.type('p').values().all();
  }
  urls() {
    return this.type('r').values().all();
  }
  asMeta() {
    return fromPairs(this.tags);
  }
  getMeta(k: string) {
    return this.type(k).values().first();
  }
  drop(n) {
    return new Tags(this.tags.map((t) => t.slice(n)));
  }
  values() {
    return new Tags(this.tags.map((t) => t[1]));
  }
  filter(f: (t: any) => boolean) {
    return new Tags(this.tags.filter(f));
  }
  reject(f: (t: any) => boolean) {
    return new Tags(this.tags.filter((t) => !f(t)));
  }
  any(f: (t: any) => boolean) {
    return this.filter(f).exists();
  }
  type(type: string | string[]) {
    const types = ensurePlural(type);

    return new Tags(this.tags.filter((t) => types.includes(t[0])));
  }
  equals(value: string) {
    return new Tags(this.tags.filter((t) => t[1] === value));
  }
  mark(mark: string | string[]) {
    const marks = ensurePlural(mark);

    return new Tags(this.tags.filter((t) => marks.includes(last(t))));
  }
}

export const findReplyAndRoot = (e: Event) => {
  const tags = Tags.from(e)
    .type('e')
    .filter((t) => last(t) !== 'mention');
  const legacy = tags.any((t) => !['reply', 'root'].includes(last(t)));

  // Support the deprecated version where tags are not marked as replies
  if (legacy) {
    const reply = tags.last();
    const root = tags.count() > 1 ? tags.first() : null;

    return { reply, root };
  }

  const reply = tags.mark('reply').first();
  const root = tags.mark('root').first();

  return { reply: reply || root, root };
};

export const findReplyAndRootIds = (e: Event) => mapVals((t) => t?.[1], findReplyAndRoot(e));

export const findReply = (e: Event) => prop('reply', findReplyAndRoot(e));

export const findReplyId = (e: Event) => findReply(e)?.[1];

export const findRoot = (e: Event) => prop('root', findReplyAndRoot(e));

export const findRootId = (e: Event) => findRoot(e)?.[1];

export const isShareableRelay = (url: string) =>
  // Is it actually a websocket url
  url.match(/^wss:\/\/.+/) &&
  // Sometimes bugs cause multiple relays to get concatenated
  url.match(/:\/\//g)?.length === 1 &&
  // It shouldn't have any whitespace
  !url.match(/\s/) &&
  // Don't match stuff with a port number
  !url.slice(6).match(/:\d+/) &&
  // Don't match raw ip addresses
  !url.slice(6).match(/\d+\.\d+\.\d+\.\d+/) &&
  // Skip nostr.wine's virtual relays
  !url.slice(6).match(/\/npub/);


  export const normalizeRelayUrl = (url: string) => {
    // If it doesn't start with a compatible protocol, strip the proto and add wss
    if (!url.match(/^wss:\/\/.+/)) {
      url = "wss://" + url.replace(/.*:\/\//, "")
    }
  
    return (tryFunc(() => new URL(url).href.replace(/\/+$/, "").toLowerCase()) || "") as string
  }
  
  export const channelAttrs = ["name", "about", "picture"]
  
