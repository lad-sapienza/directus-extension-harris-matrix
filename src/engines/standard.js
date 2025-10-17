var HmLog = require("../utils/hmlog.js");

const engineVersion = function() {
	return "Standard engine *** v0.1 ***";
}

var nodesAttributes = {};


const prepareGraph = function(graphItems, contextProps) {
	let items = graphItems;
    nodesAttributes = {}

	//Loop effort to create a map
	let validTargets = graphItems.reduce((obj, item) => {
		return {
			...obj,
			[item["context_id"]]: true,
		};
	}, {});
	
	HmLog.hmLog('Vertex count: ' + items.length);

	var arcs = [];
    var nodesRegister = {};
    var subGraphs = {};
    var subGraphsSubscriptions = {};
    var subGraphId = 0;

	for (var eidx in items) {
		let node = items[eidx];
		var nodeProps = new Array(); //WTF? - Doen't empty?
        nodeProps.push(`shape="box"`);

		if (node.context_type && contextProps[node.context_type] != null) {
			HmLog.hmLog("Adding " + contextProps[node.context_type] + " as node props");
            nodeProps = Object.assign([], contextProps[node.context_type]);
		}

        nodeProps.push(`label="${node.label}"`);

        // Register the node even if it has no stratigraphy relations so isolated
        // contexts are still rendered by the graph engine.
        let reg = {"node": node, "nodeProps": nodeProps};
        if (!nodesRegister[node["context_id"]]) {
            nodesRegister[node["context_id"]] = reg;
        }

        if (node["stratigraphy"]) {

            // normalize stratigraphy: accept object-map or array
            let strataContainer = node["stratigraphy"];
            let strataEntries = [];
            if (Array.isArray(strataContainer)) {
                strataEntries = strataContainer;
            } else if (strataContainer && typeof strataContainer === 'object') {
                // if it's an object with keys, iterate values
                strataEntries = Object.keys(strataContainer).map(k => strataContainer[k]);
            }

            for (var cix in strataEntries) {
                let child = strataEntries[cix];
                var relation = "";

                // tolerate nested 'data' wrapper used by Directus relations
                if (child == null) continue;
                let other = child["other_context"] || child["other_context_id"] || child["other"];
                if (other && other.data) other = other.data;
                // if it's array take first
                if (Array.isArray(other) && other.length) other = other[0];
                let otherContextId = null;
                if (other) {
                    otherContextId = other["context_id"] || other["id"] || other;
                }
                if (!otherContextId) continue;
                if (validTargets[otherContextId] == null) continue;

                let rel = child["relationship"] || child["relation"] || child["rel"] || child["type"] || child["relationship_type"];
                if (!rel) {
                    // nothing to do
                    continue;
                }

                if (['fills', 'covers', 'cuts', 'leans against'].includes(rel)) {
                    relation = `"${node["context_id"]}" -> "${otherContextId}";`;
                    nodesRegister[node["context_id"]] = reg;
                } else if (['is filled by', 'is covered by', 'is cut by', 'carries'].includes(rel)) {
                    relation = `"${otherContextId}" -> "${node["context_id"]}";`;
                    nodesRegister[node["context_id"]] = reg;
                } else if (['is the same as', 'is bound to'].includes(rel)) {
                    let subRelation = `"${otherContextId}" -> "${node["context_id"]}" [style="dashed", color="blue", dir="none"];`;
                    var sg = subGraphsSubscriptions[otherContextId];
                    if (sg) {
                        sg["nodes"].push(reg);
                        if (!sg["relations"].includes(subRelation)) {
                            sg["relations"].push(subRelation);
                        }
                    } else {
                        const sgid = `subg_${subGraphId}`;
                        subGraphId++;
                        var nsg = { "id": sgid }
                        subGraphsSubscriptions[node["context_id"]] = nsg;
                        var sgnodes = [reg];
                        if (nodesRegister[otherContextId]) {
                            sgnodes.push(nodesRegister[otherContextId]);
                            delete nodesRegister[otherContextId];
                            subGraphsSubscriptions[otherContextId] = nsg;
                        }
                        nsg["nodes"] = sgnodes;
                        nsg["relations"] = [subRelation];
                        subGraphs[sgid] = nsg;
                    }
                } else {
                    HmLog.hmLog(`Not managed: ${rel}`);
                }

                if (relation != "" && !arcs.includes(relation)) {
                    arcs.push(relation);
                }
            }
		}
	}

    var nodes = [];
    Object.entries(nodesRegister).forEach(([key, value]) => {
        let node = value["node"];
        let nodeProps = value["nodeProps"];
        nodes.push(`"${node["context_id"]}" [${nodeProps.join(",")}];`);
        addNodeAttibutes(node);
    });
    const subgraphs = buildSubGraphs(subGraphs);

    return {"graph": nodes.join("\n") + "\n" + arcs.join("\n") + "\n\n" + subgraphs.join("\n\n"), "attributes": nodesAttributes};
}

function buildSubGraphs(subGraphs) {
    
    var subG = [];
    
    Object.entries(subGraphs).forEach(([key, value]) => {
        var sgnodes = [];
        var ranknodes = [];
        for (var nregix in value["nodes"]) {
            const nreg = value["nodes"][nregix];
            const node = nreg["node"];
            addNodeAttibutes(node);
            const nodeProps = nreg["nodeProps"];
            sgnodes.push(`"${node["context_id"]}" [${nodeProps.join(",")}];`);
            ranknodes.push(`"${node["context_id"]}"`);
        }
        var rank = `{ rank=same; ${ranknodes.join("; ")} }`;
        subG.push(`subgraph ${key} {\nrankdir = LR;\n\n${sgnodes.join("\n")}\n${value["relations"].join("\n")}\n${rank} }`);
    });
    
    return subG;
}

function addNodeAttibutes(node) {
    nodesAttributes[node["context_id"]] = {
        "id": node.id,
        "label": node.label,
        "text": node.description,
        "context_type": node.context_type,
        "resource_id": node.id
    }; //Could not figure out how to access images
}

module.exports = { engineVersion, prepareGraph }
