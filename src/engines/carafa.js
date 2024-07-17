var HmLog = require("../utils/hmlog.js");
var HMDJ = require("../utils/hmdj.js");

const hmdjMapping = {
    "context_id": "id",
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


const prepareGraph = function(graphItems, contextProps) {
	let items = graphItems;

    for (var pk in contextProps) {
        hmdjMapping["properties"]["values"][pk] = contextProps[pk];
    }

    let hmdj = new HMDJ.HMDJ(hmdjMapping);
    var nodesAttributes = {};
    
    HmLog.hmLog('Vertex count: ' + items.length);

	for (var eidx in items) {
		let node = items[eidx];
		
        nodesAttributes[node["context_id"]] = { "id": node.id, "label": node.label, "text": node.description, "context_type": node.context_type }; //Could not figure out how to access images
        
        hmdj.addContext(node, []);
        
//		if (node["stratigraphy"]) {
//			for (var cix in node["stratigraphy"]) {
//				let child = node["stratigraphy"][cix];
//				var relation = "";
//
//				if (child["other_context"] == null) continue;
//				let otherContextId = child["other_context"]["context_id"];
//				if (validTargets[otherContextId] == null) continue;
//
//				if (child["relationship"]) {
//					if (['fills', 'covers', 'cuts', 'leans against'].includes(child["relationship"])) {
//						relation = `"${node["context_id"]}" -> "${otherContextId}";`;
//					} else if (['is filled by', 'is covered by', 'is cut by', 'carries'].includes(child["relationship"])) {
//						relation = `"${otherContextId}" -> "${node["context_id"]}";`;
//					} else if (['is the same as', 'is bound to'].includes(child["relationship"])) {
//						relation = `"${otherContextId}" -> "${node["context_id"]}" [style="dashed", color="blue", dir="none"];`;
//					} else {
//						HmLog.hmLog(`Not managed: ${child["relationship"]}`);
//						continue;
//					}
//				}
//
//				if (!arcs.includes(relation)) {
//					arcs.push(relation);
//				}
//			}
//		}
	}

	//return {"graph": nodes.join("\n") + "\n" + arcs.join("\n"), "attributes": nodesAttributes};
    return {"graph": "", "attributes": nodesAttributes};
}

module.exports = { engineVersion, prepareGraph }
