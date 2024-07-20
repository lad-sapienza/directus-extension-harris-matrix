var HmLog = require("../utils/hmlog.js");
var JGFModule = require("../utils/jgf.js");
var CarafaGraph = require("../utils/carafa_graph.js");
var jgf;

const jgfConfig = {
    "context_id": "context_id",
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
    var nodesAttributes = {};
    
    for (var pk in contextProps) {
        jgfConfig["properties"]["values"][pk] = contextProps[pk];
    }

    jgf = new JGFModule.JGF(jgfConfig);
    
    for (var eidx in items) {
		let node = items[eidx];
		
        nodesAttributes[node["context_id"]] = { "id": node.context_id, "label": node.label, "text": node.description, "context_type": node.context_type }; //Could not figure out how to access images
        
        jgf.addNode(node);

        if (node["stratigraphy"]) {
            for (var cix in node["stratigraphy"]) {
                let child = node["stratigraphy"][cix];
                if (child["other_context"] == null) continue;
                let otherContextId = child["other_context"]["context_id"];
                
                var relation = child["relationship"];
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
                        HmLog.hmLog(`Not managed: ${child["relationship"]}`);
                        continue;
                    }
                    jgf.addEdge({"relation": relation, "source": source, "target": target, "directed": directed});
                }
            }
        }
        
        
	}
    
    new CarafaGraph.CarafaGraph(jgf);

	//return {"graph": nodes.join("\n") + "\n" + arcs.join("\n"), "attributes": nodesAttributes};
    return {"graph": "", "attributes": nodesAttributes};
}

module.exports = { engineVersion, prepareGraph, fetchDataPackage }


//https://blaipratdesaba.com/how-to-use-an-npm-node-module-that-has-been-forked-b7dd522fdd08
