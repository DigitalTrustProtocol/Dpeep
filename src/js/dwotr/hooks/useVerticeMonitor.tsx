import { useEffect, useState } from "preact/hooks";
import graphNetwork from "../GraphNetwork";
import { Vertice } from "../model/Graph";
import verticeMonitor from "../VerticeMonitor";
import { UID } from "@/utils/UniqueIds";


const useVerticeMonitor = (id: UID, options?: any, option?: any) => {
    
    const [state, setState] = useState({id, options, option} as any);

    useEffect(() => {
        if(!id) return; // No id, no monitor. id = 0 is a non existing id cause by the use of ID("") in the code

        function findOption(vertice: Vertice) {
            let option = verticeMonitor.findOption(vertice, options);
            setState({ option, vertice }); 
        }

        const cb = (e: Vertice) => {
            if(e.id != id) return;

            findOption(e);
        }

        let index = verticeMonitor.subscriptions.add(id, cb);

        // Call manually the graphNetwork.resolveTrust the first time
        findOption(graphNetwork.g.vertices[id]);

        return () => {
            verticeMonitor.subscriptions.remove(id, index);
        }
    }, [id]);

    return state;
}

export default useVerticeMonitor;

