var HmLog = require("../utils/hmlog.js");
var JGFModule = require("../utils/jgf.js");
var CarafaGraph = require("../libs/carafa_graph.js");
var jgf;

// Stratigraphic relationship type constants
const RELATIONSHIP_TYPES = {
	ABOVE: ['fills', 'covers', 'cuts', 'leans against'],
	BELOW: ['is filled by', 'is covered by', 'is cut by', 'carries'],
	CONTEMPORARY: ['is the same as', 'is bound to']
};

/**
 * Configuration for JSON Graph Format generation
 * @type {Object}
 */
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

/**
 * Exports the current graph in JSON Graph Format
 * @returns {string|null} JGF stringified data or null if no graph exists
 */
const fetchDataPackage = function() {
    if(jgf) {
       return jgf.stringify();
    }
    return null;
}

/**
 * Prepares a graph using Carafa algorithm (transitive reduction + clustering)
 * @param {Array<Object>} graphItems - Array of context objects with stratigraphy data
 * @param {Object} contextProps - Visual properties for each context type
 * @returns {{graph: string, attributes: Object, error?: string}} DOT format graph with attributes
 */
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
                    if (RELATIONSHIP_TYPES.ABOVE.includes(relation)) {
                        // Source is above target (no swap needed)
                    } else if (RELATIONSHIP_TYPES.BELOW.includes(relation)) {
                        // Source is below target, swap direction
                        source = otherContextId;
                        target = node.context_id;
                    } else if (RELATIONSHIP_TYPES.CONTEMPORARY.includes(relation)) {
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
