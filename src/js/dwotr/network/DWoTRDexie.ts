import Dexie, { Table } from 'dexie';
import { EdgeRecord } from '../model/Graph';
import ProfileRecord from '../model/ProfileRecord';
import { Event } from 'nostr-tools';
import { ReactionRecord } from '../ReactionManager';
import { RelayRecord } from '../ServerManager';


export const DB_NAME = 'DWoTR';

export class DWoTRDexie extends Dexie {
  // 'vertices' is added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  //vertices!: Table<Vertice>; 
  edges!: Table<EdgeRecord>;
  profiles!: Table<ProfileRecord>; // ProfileRecord is defined with minimal properties, so all empty property names are not serialized into the database.
  follows!: Table<Event>;
  reactions!: Table<ReactionRecord>;
  notes!: Table<Event>;
  zaps!: Table<Event>;
  eventDeletions!: Table<Event>;
  blocks!: Table<Event>;
  replies!: Table<Event>;
  reposts!: Table<Event>;
  relays!: Table<RelayRecord>;

  constructor() {
    super(DB_NAME);

    this.version(13).stores({
      edges: 'key, outKey, inKey', // Primary key is a hash of the outKey and inKey, type and context
      profiles: 'key, nip05',
      reactions: 'id, eventId, profileId, created_at',
      follows: 'pubkey', // Primary key is the pubkey single event per user.
      notes: 'id, pubkey, kind, created_at, [pubkey+kind]',
      zaps: 'id, pubkey, created_at',
      eventDeletions: 'id, pubkey, created_at',
      blocks: 'id, pubkey, created_at',
      replies: 'id, pubkey, created_at',
      reposts: 'id, pubkey, created_at',
      relays: 'url',
    });
  }
}
let dwotrDB = new DWoTRDexie();  


export default dwotrDB;

export function resetWoTDatabase() {
  return dwotrDB.transaction('rw', dwotrDB.edges, dwotrDB.profiles, async () => {
    await Promise.all(dwotrDB.tables.map(table => table.clear()));
  });
}