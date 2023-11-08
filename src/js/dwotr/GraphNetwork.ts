//import * as bech32 from 'bech32-buffer'; /* eslint-disable-line @typescript-eslint/no-var-requires */
import Graph, { Edge, EdgeRecord, EntityType, Vertice } from './model/Graph';
import { MAX_DEGREE } from './model/TrustScore';
import { debounce } from 'lodash';
import Key from '@/nostr/Key';
import { ID } from '@/utils/UniqueIds';

import verticeMonitor from './VerticeMonitor';
import { getNostrTime } from './Utils';
import blockManager from './BlockManager';
import storage from './Storage';
import relaySubscription from './network/RelaySubscription';
import profileManager from './ProfileManager';
import { BulkStorage } from './network/BulkStorage';
import trustManager from './TrustManager';

export type ResolveTrustCallback = (result: any) => any;

export type ReadyCallback = () => void;

export const TRUST1 = 'trust1';

class GraphNetwork {
  localDataLoaded = false;

  g = new Graph();

  sourceKey: string | undefined;
  sourceId: number = -1;

  maxDegree = MAX_DEGREE;
  readyCallbacks: ReadyCallback[] = [];

  processItems = {}; // Items to process
  processGraph = false; // True if graph has to reprocessed
  processScoreDebounce = debounce(this.processScore, 1000, { trailing: true }); // 'maxWait':

  submitTrustIndex = {};
  profilesLoaded = false;

  table = new BulkStorage(storage.edges);

  metrics = {
    Vertices: 0,
    Edges: 0,
    SubscribedtoRelays: 0,
  };



  async init(source: string) {
    this.sourceKey = source;
    if (this.localDataLoaded) return;

    this.sourceId = ID(this.sourceKey);
    this.g.addVertice(this.sourceId); // Add the source vertice to the graph

    // Load all vertices from the DB into the graph
    let list = await storage.edges.toArray();
    for (let record of list) {
      this.g.addEdge(record, false); // Load all edges from the DB into the graph with partial data
    }

    console.log('Loaded ' + list.length + ' edges from the DB');

    console.info(
      'Graph: ' +
        Object.entries(this.g.vertices).length +
        ' vertices and ' +
        Object.entries(this.g.edges).length +
        ' edges',
      //'List: ' + list.length + ' edges'
    );

    // Calculate the score for all vertices within degree of maxDegree
    graphNetwork.g.calculateScore(graphNetwork.sourceId, this.maxDegree);
    
    this.localDataLoaded = true;

    for (let callback of this.readyCallbacks) {
      callback();
    }

    this.readyCallbacks = [];
  }

  // Load of vertices from the DB can take some time and is done async, so this function calls back when the data is loaded
  whenReady(callback: ReadyCallback) {
    if (this.localDataLoaded) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  publishTrust(
    to: string,
    val: number = 0,
    entityType: EntityType = EntityType.Key,
    comment?: string,
    context: string = 'nostr',
  ): void {
    // Add the trust to the local graph, and update the score
    const timestamp = getNostrTime();
    const props = { from: this.sourceKey, to, val, entityType, context, note: comment, timestamp };

    const { outV, inV, preVal, change } = this.setTrust(props, false);

    if (!change) return;
    // Update the vertice monitors

    // Update the Graph score
    this.addToProcessScoreQueue(outV, inV);
    this.processScore();

    // Publish the trust to the network, using a debounce function to only publish the last call to the relays if multiple calls are made within X seconds on the same key.
    // Locally the trust is added immediately, but the relays is only updated after X seconds, to allow for "regret" of choice.
    let callKey = TRUST1 + this.sourceKey + to + context; // Create a unique key for this call, of: Type + from + to + context
    let publishTrustDebounce = this.submitTrustIndex[callKey];

    if (!publishTrustDebounce) {
      publishTrustDebounce = debounce(async (currentVal: number) => {
        // Test if anything has changed to the trust, as the user may have changed his mind within the X seconds
        // preVal will contain the value from when the function first was created.
        if (preVal == currentVal) return; // In the end, if trust value has not changed, then don't publish the trust to the network

        // Publish the trust to the network is pretty slow, may be web workers can be used to speed it up UI
        trustManager.publishTrust(
          to,
          currentVal,
          comment,
          context,
          entityType,
          timestamp,
        );

        //console.log("GraphNetwork.publishTrust.debounce Fn Published to relays - " + to + "  preVal: " + preVal + "  currentVal: " + currentVal);
        delete this.submitTrustIndex[callKey];
      }, 3000); // wait a little time before publishing trust to the network, to allow for "regret" of choice

      this.submitTrustIndex[callKey] = publishTrustDebounce;
    }

    publishTrustDebounce(val); // Call the debounce function, which will only call the publishTrust() function after X seconds, if no other call is made within that time

    //console.timeEnd("GraphNetwork.publishTrust");
  }

  addToProcessScoreQueue(outV: Vertice, inV: Vertice) {
    // Why is outV sometimes undefined?
    if (!outV) console.log('addToProcessScoreQueue: outV is undefined, inV: ' + inV);

    if (!outV || outV.score.atDegree > this.maxDegree+1) return; // No need to update the score

    if (outV.score.atDegree == this.maxDegree+1) { 
      this.processItems[inV.id as number] = true; // Add the vertice to the list of items to process
    } else {
      if (inV.entityType == EntityType.Key) {
        if (inV.score.atDegree == this.maxDegree+1) {
          // Only process the score of all outV vertices
          this.processGraph = true; // For now, process the whole graph
        } else this.processGraph = true; // Set the flag to process the whole graph
      } else {
        this.processItems[inV.id as number] = true; // Add the vertice to the list of items to process
      }
    }
  }

  // Calculate the score of all vertices within degree of maxDegree
  processScore() {
    let changedItems : Array<Vertice> = [];

    if (this.processGraph) {
      changedItems = graphNetwork.g.calculateScore(graphNetwork.sourceId, this.maxDegree); // Calculate the score for all vertices within degree of maxDegree
    } else {
      
      for (const key in graphNetwork.processItems) {
        if(graphNetwork.g.calculateItemScore(parseInt(key))) // Calculate the score each single vertice in the list
          changedItems.push(graphNetwork.g.vertices[key] as Vertice); // Add the vertice to the list of items to that have changed
      }
    }

    if (changedItems.length === 0) return; // Nothing to process

    // TODO: Only process the vertices that have changed
    // TODO: The changedItems list is not of deep changes detection.
    verticeMonitor.dispatchAll(); // Dispatch all the vertices that have changed

    blockManager.dispatchAll(); // Dispatch to all subscribers possible changes to the block list

    if (this.processGraph) {
      // TODO: Make this async as it is slow
      graphNetwork.subscribeMap();
    }

    this.processGraph = false;
    this.processItems = {};
  }

  subscribeMap() {
    let vertices = this.g.getUnsubscribedVertices(this.maxDegree);
    if (vertices.length == 0) return; // Nothing to subscribe to

    let authors = vertices.map((v) => v.id);
    vertices.forEach((v) => (v.subscribed = 1)); // Mark the vertices as subscribed with the current subscription counter

    this.metrics.SubscribedtoRelays += authors.length;

    profileManager.mapProfiles(authors);
  }

  // Fetching from the relays once
  // Used for initial load of data from the relays
  async subscribeOnce(since?: number, until?: number) {
    let vertices = this.g.getUnsubscribedVertices(this.maxDegree);
    if (vertices.length == 0) return; // Nothing to subscribe to

    let authors = vertices.map((v) => v.id);

    this.metrics.SubscribedtoRelays = authors.length;

    await relaySubscription.onceAuthors(authors, since, until);
  }


  setTrust(props: any, isExternal: boolean) {
    let { edge, preVal, change } = this.putEdge(props, isExternal);
    let outV = edge?.out;
    let inV = edge?.in;

    return { outV, inV, edge, preVal, change };
  }

  putEdge(props: any, isExternal: boolean) {
    let { from, to, val, entityType, context, note, timestamp } = props;
    let type = 1; // Trust1
    let preVal = undefined;
    let change = false;

    let key = Edge.key(type, from, to, context); // Create the key for the edge
    let edge = this.g.edges[key];

    if (!edge) {
      if (val == 0 && isExternal) return { edge, preVal, change }; // No need to add an edge if the value is 0

      let record = new EdgeRecord();
      record.type = type;
      record.key = key;
      record.from = from;
      record.to = to;
      record.val = val;
      record.entityType = entityType;
      record.context = context;
      record.note = note;
      record.timestamp = timestamp;
      this.table.save(record.key, record);

      edge = this.g.addEdge(record, false); // Add the record to the graph and return the graph edge

      change = true;
    } else {
      preVal = edge.val;

      // If data is older or the same as the current data and value, then ignore it.
      // Sometimes the value is different but the timestamp is the same, so we need to update the timestamp and value. Very fast hitting the trust / distrust buttons.
      if (edge.timestamp < timestamp || (edge.val != val && edge.timestamp == timestamp)) {
        // Always update the edge as timestamp is always updated.

        let updateObject = { timestamp: 0 };

        if (edge.val != val) edge.val = updateObject['val'] = val;
        if (edge.context != context) edge.context = updateObject['context'] = context;
        if (edge.note != note) edge.note = updateObject['note'] = note;
        if (edge.entityType != entityType)
          edge.entityType = updateObject['entityType'] = entityType;

        edge.timestamp = updateObject.timestamp = timestamp; // Update the timestamp to the latest event.

        if (edge.val == 0 && isExternal) {
          // Delete the edge if the value is 0 / neutral and it is an external event
          this.table.delete(key);
          this.g.removeEdge(edge);
          edge = undefined;
        } else {
          this.table.update(key, updateObject);
        }

        change = true;
      }
    }

    return { edge, preVal, change };
  }

  setTrustAndProcess(
    to: string,
    from: string,
    entityType: EntityType,
    val: number,
    note: string,
    context: string | undefined,
    timestamp: number,
  ) {
    if (!to || to.length < 2) return;
    //to = graphNetwork.getHexKey(to);
    to = Key.toNostrHexAddress(to) as string;

    // Add the Trust Event to the memory Graph and IndexedDB
    let { outV, inV, change } = graphNetwork.setTrust(
      { from, to, val, note, context, entityType, timestamp },
      true,
    );

    if (change) {
      graphNetwork.addToProcessScoreQueue(outV, inV);
      graphNetwork.processScoreDebounce(); // Wait a little before processing the score, to allow for multiple updates to be made at once
    }
  }



  getTrustList(inV: Vertice, val: number): Array<any> {
    if (!inV) return [];
    let result = new Array<any>();

    for (const outId in inV.in) {
      const edge = this.g.getEdge(inV.in[outId]) as Edge;

      let outV = this.g.vertices[outId] as Vertice;
      if (!outV) continue;

      if (edge.val == val) {
        result.push({ outV, edge });
      }
    }
    return result;
  }

  isTrusted(id: number) : boolean {
    let vertice = this.g.vertices[id] as Vertice;
    if(!vertice) return false;
    return vertice.score.trusted();
  }

  isDistrusted(id: number) : boolean {
    let vertice = this.g.vertices[id] as Vertice;
    if(!vertice) return false;
    return vertice.score.distrusted();
  }

  getMetrics() {
    this.metrics.Vertices = Object.entries(this.g.vertices).length;
    this.metrics.Edges = Object.entries(this.g.edges).length;
    return this.metrics;
  }
}

const graphNetwork = new GraphNetwork();

export default graphNetwork;
