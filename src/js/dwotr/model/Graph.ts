import { ID, UID } from '@/utils/UniqueIds';
import { sha256 } from '../Utils';
import TrustScore, { MAX_DEGREE } from './TrustScore';

export enum EntityType {
  Key = 1,
  Item = 2,
  Unknown = 3,
}

export const UNDEFINED_DEGREE = 99;

export type VerticeUnsubscribe = () => void;

export class Vertice {
  id: number = 0; // The id of the vertice
  //key: string  = ""; // The public key of the subject or item
  out = Object.create(null); // Map of edges going out from this vertice. Key is the id of the target vertice. Use Object.create(null) to avoid prototype pollution.
  in = Object.create(null); // Map of edges going in to this vertice. Key is the id of the source vertice. Use Object.create(null) to avoid prototype pollution.
  degree: number = UNDEFINED_DEGREE;
  entityType: number = 1; // Type 1 is Key and 2 is item. Items cannot issue Trust claims.
  timestamp = 0; // Timestamp of lasest update, used to limit subscription at the relays to only new events.
  subscribed = 0; // True if subscribed to updates from relays
  score: TrustScore = new TrustScore(); // The score of the vertice, calculated from the trust edges, used to subscribe to updates from relays when the score is positive.
  oldScore: TrustScore | undefined;
  profile: any = undefined; // The profile of the vertice, used to display the name and avatar of the vertice.

  constructor(id: number, degree: number = UNDEFINED_DEGREE) {
    this.id = id;
    this.score.atDegree = degree;
  }
}

export class EdgeBase {
  key: string = ''; // The public key of the edge
  type: number = 1; // The type of the edge 1 = Trust1
  val: any = undefined; // The value of the edge, 1 is trust, 2 is distrust, 3 is neutral
  entityType: EntityType = 1; // Type 1 is Key and 2 is item. Items cannot issue Trust claims.
  context: string = ''; // The context of the edge
  note: string = ''; // A note about the edge
  timestamp = 0; // Timestamp of latest update, used to update the edge with only the latest values.
}

// Used in IndexedDB
export class EdgeRecord extends EdgeBase {
  from = ''; // The public key of the source vertice
  to = ''; // The public key of the target vertice
}

// Used in memory
export class Edge extends EdgeBase {
  out: Vertice | undefined; // The id of the source vertice, can be a reference now!!!
  in: Vertice | undefined; // The id of the target vertice

  partial: boolean = true; // True if the edge is partial, has not loaded all data

  // Minimize memory usage by only storing minimal data in memory
  static partialFrom(record: EdgeRecord): Edge {
    let edge = new Edge();
    edge.key = record.key;
    edge.entityType = record.entityType;
    edge.type = record.type;
    edge.val = record.val;
    edge.timestamp = record.timestamp;
    edge.partial = true;
    //edge.context = record.context;
    //edge.note = record.note;

    return edge;
  }

  static key(type: number, outKey: string, inKey: string, context: string): string {
    let key = `${type}|${outKey}|${inKey}|${context}`;
    return sha256(key);
  }

  fill(record: EdgeRecord): void {
    this.val = record.val;
    this.context = record.context;
    this.note = record.note;
    this.timestamp = record.timestamp;
    this.partial = false;
  }
}

export default class Graph {
  vertices = {};
  edges = {};

  addVertice(id: number): Vertice {
    return (this.vertices[id] as Vertice) || (this.vertices[id] = new Vertice(id));
  }

  addEdge(record: EdgeRecord, fill: boolean = false): Edge {
    let edge = this.edges[record.key] as Edge;
    if (!edge) {
      // Create new edge

      edge = Edge.partialFrom(record);
      this.edges[record.key] = edge;

      edge.out = this.addVertice(ID(record.from));
      edge.in = this.addVertice(ID(record.to));

      edge.out.out[edge.in.id] = edge;
      edge.in.in[edge.out.id] = edge;
    }

    // Memory saving feature, only fill all data if requested
    if (fill) {
      edge.fill(record);
    } else {
      edge.val = record.val;
      edge.timestamp = record.timestamp;
    }

    // Update the timestamp of the vertices if the edge is newer
    if (edge?.out && edge.out.timestamp < edge.timestamp) edge.out.timestamp = edge.timestamp;
    if (edge?.in && edge.in.timestamp < edge.timestamp) edge.in.timestamp = edge.timestamp;

    return edge;
  }

  removeEdge(e: Edge): void {
    const outV = e.out as Vertice;
    const inV = e.in as Vertice;
    if (outV) delete outV.out[inV.id as number];
    if (inV) delete inV.in[outV.id as number];
    delete this.edges[e.key];
  }

  getVertice(key: string): Vertice | undefined {
    const id = this.getVerticeId(key);
    if (id == undefined) return undefined;
    return this.vertices[id];
  }

  getEdge(key: string): Edge | undefined {
    return this.edges[key];
  }

  getVerticeId(key: string | undefined | null): number | undefined {
    if (!key) return undefined;
    let id = ID(key);
    return id;
  }

  // Make sure all relevant vertices have score and degree set
  calculateScore(sourceId: number, maxDegree: number): Array<Vertice> {
    let queue = [] as Array<Vertice>;
    let nextQueue = Object.create(null); // Use null to avoid prototype pollution

    let startV = this.vertices[sourceId] as Vertice;
    if (!startV) return []; // Source vertice not found

    this.resetScore(); // Reset all scores in the graph

    let degree = (startV.score.atDegree = 0);

    queue.push(startV); // Add the source vertice id to the queue as starting point

    while (queue.length > 0 && degree <= maxDegree) {
      for (let outV of queue) {
        if (degree > 0 && !outV.score.trusted()) continue; // Skip if the vertice is distrusted or not trusted and is not the start vertice

        let nextDegree = degree + 1;

        for (const inId in outV.out) {
          const inV = this.vertices[inId] as Vertice;

          const edge = outV.out[inId]; // Get the edge object
          if (!edge || edge.val === 0) continue; // Skip if the edge has no value / neutral

          inV.score.addValue(edge.val, nextDegree); // Add the edge value to the score

          if (degree >= inV.score.atDegree) continue; // Skip if degree is already set by a shorter path

          // TODO: This should be set by majority of edges with best trust
          // --------------------------------
          if (nextDegree <= inV.score.atDegree)
            // Lowest degree so far decides the entityType
            inV.entityType = edge.entityType;
          // --------------------------------

          if (degree < maxDegree && inV.entityType === EntityType.Key && !nextQueue[inId])
            // Only add keys to the queue, setting values takes time
            nextQueue[inId] = inV; // Only add the in vertice to the queue once
        }
      }

      queue = Object.values(nextQueue) as Array<Vertice>;
      nextQueue = Object.create(null); // Clear the next queue
      degree++;
    }

    // Find all vertices that have changed score
    let changed = [] as Array<Vertice>;
    for (let key in this.vertices) {
      const v = this.vertices[key] as Vertice;
      if (v.score.hasChanged(v.oldScore)) changed.push(v);
    }
    return changed;
  }

  // Calculate the score of a single item, used when a value is added to an item
  // Theres no need to calculate the score of all vertices as the score of the item cannot affect the score of other items.
  calculateItemScore(id: number): boolean {
    let vertice = this.vertices[id] as Vertice;

    vertice.oldScore = vertice.score;
    vertice.score = new TrustScore();

    // Find lowest degree
    for (const outId in vertice.in) {
      const outV = this.vertices[outId] as Vertice;
      if (outV.score.atDegree > MAX_DEGREE + 1) continue; // Skip if the in vertice has no degree or above max degree

      const edge = vertice.in[outId];
      if (!edge || edge.val == 0) continue; // Skip if the edge has no value / neutral

      vertice.score.addValue(edge.val, outV.score.atDegree + 1);
    }

    return vertice.score.hasChanged(vertice.oldScore);
  }

  resetScore() {
    for (let key in this.vertices) {
      const v = this.vertices[key] as Vertice;
      v.oldScore = v.score; // Save the old score
      v.score = new TrustScore();
    }
  }

  // wotNetwork(entityType?:EntityType, maxDegree:number = MAX_DEGREE+1) : Array<Vertice> {
  //     let result = [] as Array<Vertice>;

  //     for(const key in this.vertices) {
  //         const v = this.vertices[key] as Vertice;

  //         if(v.degree <= maxDegree                                // Only add vertices with a degree less than maxDegree
  //             && v.degree > 0                                     // Skip the source vertice
  //             && (!entityType || v.entityType === entityType)) {  // Only add vertices of the specified type
  //             result.push(v);
  //         }
  //     }
  //     return result;
  // }

  // inOutTrustById(sourceId: number, entityType?:EntityType, trust1?:number) : Array<Vertice> {
  //     const sourceV = this.vertices[sourceId] as Vertice;
  //     if(!sourceV) return [];

  //     let obj = Object.create(null) as {[key: string]: Vertice};

  //     for(const key in sourceV.in) {
  //         const outV = this.vertices[key] as Vertice;
  //         if(!outV || outV.degree > MAX_DEGREE) continue; // Skip if the in vertice has no degree or above max degree

  //         const edge = sourceV.in[key];
  //         if(!edge || edge.val == 0 || (trust1 && edge.val != trust1)) continue; // Skip if the edge has no value / neutral

  //         obj[key] = outV;
  //     }
  //     for(const key in sourceV.out) {
  //         const edge = sourceV.out[key];
  //         if(!edge || edge.val == 0 || (trust1 && edge.val != trust1)) continue; // Skip if the edge has no value / neutral

  //         const inV = this.vertices[key] as Vertice;
  //         if(!entityType || inV.entityType === entityType)
  //             obj[key] = inV;
  //     }
  //     return Object.values(obj);
  // }

  // getEdges(sourceId: number, entityType?:EntityType, trust1?:number) : any {
  //     let edges = Object.create(null) as {[key: string]: Edge};
  //     const sourceV = this.vertices[sourceId] as Vertice;
  //     for(const id in sourceV.in) {
  //         const edge = sourceV.in[id] as Edge;
  //         if(!edge || edge.val == 0 || (trust1 && edge.val != trust1)) continue; // Skip if the edge has no value / neutral
  //         if(!edge.out || edge.out.degree > MAX_DEGREE) continue; // Skip if the in vertice has no degree or above max degree

  //         edges[edge.key] = edge;
  //     }
  //     for(const id in sourceV.out) {
  //         const edge = sourceV.out[id] as Edge;
  //         if(!edge || edge.val == 0 || (trust1 && edge.val != trust1)) continue; // Skip if the edge has no value / neutral

  //         if(!entityType || edge.in?.entityType === entityType)
  //             edges[edge.key] = edge;
  //     }
  //     return edges;
  // }

  outTrustById(sourceId: number, entityType?: EntityType, trust1?: number): Array<Vertice> {
    let result = [] as Array<Vertice>;
    const sourceV = this.vertices[sourceId] as Vertice;
    for (const key in sourceV.out) {
      const inV = this.vertices[key] as Vertice;

      const edge = sourceV.out[key];
      if (!edge || edge.val == 0 || (trust1 && edge.val != trust1)) continue; // Skip if the edge has no value / neutral

      if (!entityType || inV.entityType === entityType) result.push(inV);
    }
    return result;
  }

  trustedBy(
    sourceId: number,
    entityType?: EntityType,
    trust1?: number,
    maxDegree: number = MAX_DEGREE + 1,
  ): Array<Vertice> {
    let result = [] as Array<Vertice>;
    const sourceV = this.vertices[sourceId] as Vertice;

    for (const key in sourceV.in) {
      const outV = this.vertices[key] as Vertice;
      if (!outV || outV.score.atDegree > maxDegree) continue; // Skip if the in vertice has no degree or above max degree

      const edge = sourceV.in[key];
      if (!edge || edge.val == 0 || (trust1 && edge.val != trust1)) continue; // Skip if the edge has no value / neutral

      if (!entityType || outV.entityType === entityType) result.push(outV);
    }
    return result;
  }

  getPaths(targetId: number): Array<Edge> {
    let result = [] as Array<Edge>;

    const targetV = this.vertices[targetId] as Vertice;
    if (!targetV) return result;

    let queue = [] as Array<Vertice>;
    let nextQueue = [] as Array<Vertice>;

    queue.push(targetV); // Add the target vertice id to the queue as starting point

    while (queue.length > 0) {
      for (let inV of queue) {
        if (inV.score.atDegree == 0) continue; // Skip the source vertice, as we are done

        for (const inId in inV.in) {
          const edge = inV.in[inId] as Edge; // Get the edge object
          if (!edge || edge.val === 0) continue; // Skip if the edge has no value / neutral

          const outV = edge.out as Vertice;
          if (!outV || outV.score.atDegree >= inV.score.atDegree) continue; // Skip if degree is higher or equal to the current degree as we are looking for the shortest path

          result.push(edge); // Add the edge to the result
          nextQueue.push(outV); // Add the out vertice to the next queue
        }
      }

      queue = nextQueue;
      nextQueue = []; // Clear the next queue
    }

    return result;
  }

  getUnsubscribedVertices(maxDegree: number): Array<Vertice> {
    let vertices = new Array<Vertice>();
    for (const key in this.vertices) {
      const v = this.vertices[key] as Vertice;

      if (v.subscribed == 0 && v.entityType == EntityType.Key && v.score.trusted())
        vertices.push(v);
    }
    return vertices;
  }
}
