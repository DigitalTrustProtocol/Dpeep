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

  constructor() {
    super(DB_NAME);

    this.version(6).stores({
      edges: 'key, outKey, inKey', // Primary key is a hash of the outKey and inKey, type and context
      profiles: 'key, nip05',
      follows: 'id, pubkey',
      reactions: 'id, eventId, profileId, created_at',
    });
  }
}
let dwotrDB = new DWoTRDexie();  

// dwotrDB.open().then(() => {
//   console.log('Database opened version:', dwotrDB.verno);
//   if (dwotrDB.verno <= 4) { // Checking the database version
//     dwotrDB.delete().then(() => {
//       // Recreate the database here
//       console.log('Database deleted version:', dwotrDB.verno);
//       dwotrDB.open().then(() => {
//         console.log('Database opened version:', dwotrDB.verno);
//       });
//     }
//     );
//   }
// });

export default dwotrDB;

export function resetWoTDatabase() {
  return dwotrDB.transaction('rw', dwotrDB.edges, dwotrDB.profiles, async () => {
    await Promise.all(dwotrDB.tables.map(table => table.clear()));
  });
}