import graphNetwork from './GraphNetwork';
import { Vertice } from './model/Graph';
import EventCallbacks from './model/EventCallbacks';

class VerticeMonitor {
  callbacks = new EventCallbacks();

  processChange(vertices: Array<Vertice>) {
    if (!vertices || vertices.length == 0) return;

    for (const v of vertices) {
      if (!v) continue;

      if (v.oldScore) {
        if (v.oldScore.trusted() && !v.score.trusted()) this.dispatch(v); // If old true and new false then call
        if (!v.oldScore.trusted() && v.score.trusted()) this.dispatch(v); // If old false and new true then call

        // if (v.oldScore.trusted() && v.score.trusted()) continue;// If old true and new true then no change
        // if (!v.oldScore.trusted() && !v.score.trusted()) continue;// If old false and new false then no change

        continue;
      }

      if (v.score.trusted()) this.dispatch(v); // If old undefined and new true then call

      //if (!v.score.trusted()) continue;// If old undefined and new false then no change
    }
  }

  dispatchAll() {
    for (const id of this.callbacks.keys()) {
      let vertice = graphNetwork.g.vertices[id];
      if (!vertice) continue;

      if(vertice.score.equals(vertice.oldScore)) continue; // No change

      this.dispatch(vertice);
    }
  }

  dispatch(vertice: Vertice) {
    this.callbacks.dispatch(vertice.id, vertice);
  }

  findOption(vertice: Vertice | undefined, options: Array<any> | undefined): any {
    if (!vertice || !options || options.length === 0 || vertice.score.atDegree == 0) return undefined;

    let score = vertice.score;

    if (score.total === 0) return undefined;  // No trust yet

    // If the score is directly trust by degree 0, return the first or last option or undefined
    if (score.atDegree === 1) {
      if (score.result > 0) return options[options.length - 1];
      else if (score.result < 0) return options[0];
      else return undefined;
    }

    let percent = ((score.result + score.total) * 100) / (score.total * 2);
    let index = Math.ceil(percent / (100.0 / options.length));

    index = index === 0 ? 1 : index > options.length ? options.length : index; // Ajust lower and upper out of bounce values.

    return options[index - 1];
  }
}

const verticeMonitor = new VerticeMonitor();
export default verticeMonitor;
