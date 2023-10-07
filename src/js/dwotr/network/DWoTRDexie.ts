import Dexie, { Table } from 'dexie';
import { EdgeRecord } from '../model/Graph';
import ProfileRecord from '../model/ProfileRecord';
import { Event } from 'nostr-tools';
import { ReactionRecord } from '../ReactionManager';


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

  constructor() {
    super(DB_NAME);

    this.version(9).stores({
      edges: 'key, outKey, inKey', // Primary key is a hash of the outKey and inKey, type and context
      profiles: 'key, nip05',
      reactions: 'id, eventId, profileId, created_at',
      follows: 'pubkey', // Primary key is the pubkey single event per user.
      notes: 'id, pubkey, kind, created_at, [pubkey+kind]',
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