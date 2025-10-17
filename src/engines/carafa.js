var HmLog = require("../utils/hmlog.js");
var JGFModule = require("../utils/jgf.js");
var CarafaGraph = require("../libs/carafa_graph.js");
var jgf;

const jgfConfig = {
    "context_id": "context_id",
    "context_type": "context_type",
    "context_label": "label",
    "context_description": "description",
    "properties": {
        "key": "context_type",
        "values": {}
    },
    "map_data": false,
    "multi": false,
    "allow_looping_nodes": false
};

const engineVersion = function() {
	return "Carafa engine *** v0.1 ***";
}

const fetchDataPackage = function() {
    if(jgf) {
       return jgf.stringify();
    }
    return null;
}

const prepareGraph = function(graphItems, contextProps) {
	let items = graphItems;
    
    for (var pk in contextProps) {
        jgfConfig["properties"]["values"][pk] = contextProps[pk];
    }

    jgf = new JGFModule.JGF(jgfConfig);
    
    // Create a map of valid node IDs to avoid referencing non-existent nodes
    let validNodeIds = {};
    for (var eidx in items) {
        validNodeIds[items[eidx].context_id] = true;
    }
    
    for (var eidx in items) {
		let node = items[eidx];
        jgf.addNode(node);

        if (node["stratigraphy"]) {
            // normalize stratigraphy container
            let strataContainer = node["stratigraphy"];
            let strataEntries = [];
            if (Array.isArray(strataContainer)) {
                strataEntries = strataContainer;
            } else if (strataContainer && typeof strataContainer === 'object') {
                strataEntries = Object.keys(strataContainer).map(k => strataContainer[k]);
            }

            for (var cix in strataEntries) {
                let child = strataEntries[cix];
                if (!child) continue;

                // tolerate nested 'data' wrapper
                let other = child["other_context"] || child["other_context_id"] || child["other"];
                if (other && other.data) other = other.data;
                if (Array.isArray(other) && other.length) other = other[0];
                let otherContextId = null;
                if (other) otherContextId = other["context_id"] || other["id"] || other;
                if (!otherContextId) continue;
                // Skip edges to nodes that don't exist in the current filtered set
                if (!validNodeIds[otherContextId]) continue;

                var relation = child["relationship"] || child["relation"] || child["rel"] || child["type"] || child["relationship_type"];
                if (relation) {
                    var source = node.context_id;
                    var target = otherContextId;
                    var directed = true;
                    if (['fills', 'covers', 'cuts', 'leans against'].includes(relation)) {
                        //Nothing to do here
                    } else if (['is filled by', 'is covered by', 'is cut by', 'carries'].includes(relation)) {
                        //Swap
                        source = otherContextId;
                        target = node.context_id;
                    } else if (['is the same as', 'is bound to'].includes(relation)) {
                        directed = false;
                    } else {
                        HmLog.hmLog(`Not managed: ${relation}`);
                        continue;
                    }
                    jgf.addEdge({"relation": relation, "source": source, "target": target, "directed": directed});
                }
            }
        }
        
        
	}
    
    try {
        const carafaGraph = new CarafaGraph(jgf.graph, contextProps["--ce-cluster"]);
        return {"graph": carafaGraph.dot().join("\n"), "attributes": carafaGraph.nodesAttributes()};
    } catch (error) {
        alert("Error: " + error);
        return {"graph": "", "attributes": {}};
    }
}

module.exports = { engineVersion, prepareGraph, fetchDataPackage }
