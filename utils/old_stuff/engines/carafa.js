var HmLog = require("../utils/hmlog.js");
var HMDJModule = require("../utils/hmdj.js");
var hmdj;

const hmdjMapping = {
    "context_id": "context_id",
    "context_label": "label",
    "context_description": "description",
    "properties": {
        "key": "context_type",
        "values": {}
    },
    "map_data": false
};

const engineVersion = function() {
	return "Carafa engine *** v0.1 ***";
}

const fetchDataPackage = function(as_array) {
    if(hmdj) {
       return hmdj.stringify(as_array);
    }
    return null;
}

const prepareGraph = function(graphItems, contextProps) {
	let items = graphItems;
    var nodesAttributes = {};
    
    for (var pk in contextProps) {
        hmdjMapping["properties"]["values"][pk] = contextProps[pk];
    }

    hmdj = new HMDJModule.HMDJ(hmdjMapping);
    
    HmLog.hmLog('Vertex count: ' + items.length);

	for (var eidx in items) {
		let node = items[eidx];
		
        nodesAttributes[node["context_id"]] = { "id": node.context_id, "label": node.label, "text": node.description, "context_type": node.context_type }; //Could not figure out how to access images

        var arcs = [];
        if (node["stratigraphy"]) {
            for (var cix in node["stratigraphy"]) {
                let child = node["stratigraphy"][cix];
                if (child["other_context"] == null) continue;
                let otherContextId = child["other_context"]["context_id"];
                
                var relType = child["relationship"];
                if (relType) {
                    var relation = {"type": relType, "context": otherContextId};
                    if (['fills', 'covers', 'cuts', 'leans against'].includes(relType)) {
                        relation["direction"] = "->";
                    } else if (['is filled by', 'is covered by', 'is cut by', 'carries'].includes(relType)) {
                        relation["direction"] = "<-";
                    } else if (['is the same as', 'is bound to'].includes(relType)) {
                        relation["direction"] = "--";
                    } else {
                        HmLog.hmLog(`Not managed: ${child["relationship"]}`);
                        continue;
                    }
                               
                }
                arcs.push(relation);
            }
        }
        
        hmdj.addContext(node, arcs);
	}

	//return {"graph": nodes.join("\n") + "\n" + arcs.join("\n"), "attributes": nodesAttributes};
    return {"graph": "", "attributes": nodesAttributes};
}

module.exports = { engineVersion, prepareGraph, fetchDataPackage }


//https://blaipratdesaba.com/how-to-use-an-npm-node-module-that-has-been-forked-b7dd522fdd08
