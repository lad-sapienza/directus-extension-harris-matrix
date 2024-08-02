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
        let reg = {"node": node, "nodeProps": nodeProps};
		
		if (node["stratigraphy"]) {
			for (var cix in node["stratigraphy"]) {
				let child = node["stratigraphy"][cix];
				var relation = "";

				if (child["other_context"] == null) continue;
				let otherContextId = child["other_context"]["context_id"];
				if (validTargets[otherContextId] == null) continue;

                if (child["relationship"]) {
					if (['fills', 'covers', 'cuts', 'leans against'].includes(child["relationship"])) {
						relation = `"${node["context_id"]}" -> "${otherContextId}";`;
                        nodesRegister[node["context_id"]] = reg;
					} else if (['is filled by', 'is covered by', 'is cut by', 'carries'].includes(child["relationship"])) {
						relation = `"${otherContextId}" -> "${node["context_id"]}";`;
                        nodesRegister[node["context_id"]] = reg;
					} else if (['is the same as', 'is bound to'].includes(child["relationship"])) {
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
						HmLog.hmLog(`Not managed: ${child["relationship"]}`);
					}
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
