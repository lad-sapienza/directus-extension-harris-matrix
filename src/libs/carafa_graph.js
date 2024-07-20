var HmLog = require("../utils/hmlog.js");


const CarafaGraph = function(jgf) {
    
    this.jfg = Object.assign({}, jgf); //Shallow copy is ok
    HmLog.hmLog("\n\n-------------------- PLAIN");
    HmLog.hmLog(JSON.stringify(this.jfg, null, 4));
    
    /** BLOCK 1 Clustering */
    
    /** BLOCK 1.1 Filtering edges */
    /** Both operations are linear so this block doesnt' exceed O(E) */
    var directed_edges = this.jfg.graph.edges.filter((edge) => edge.directed == true);
    var clustering_edges = this.jfg.graph.edges.filter((edge) => edge.directed != true);
    
    /** BLOCK 1.2 Preparing clustering paths */
    /** 2*O(E) So... O(E)*/
    var clustering_paths = {};
    for (var ceidx in clustering_edges) {
        let ce = clustering_edges[ceidx];
        if (clustering_paths[ce["source"]] == null) {
            clustering_paths[ce["source"]] = {"edges": new Set()};
        }
        clustering_paths[ce["source"]]["edges"].add(ce["target"]);
        
        if (clustering_paths[ce["target"]] == null) {
            clustering_paths[ce["target"]] = {"edges": new Set()};
        }
        clustering_paths[ce["target"]]["edges"].add(ce["source"]);
    }
    
    
    /** BLOCK 1.3 Touching cluster */
    /** O(N) + O(E)*/
    buildClusters(clustering_paths);
    //HmLog.hmLog("Clustering map");
    //HmLog.hmLog(JSON.stringify(clustering_paths, null, 4));
    
    
    /** BLOCK 1.4 Clustering nodes */
    /** Alllllways linear, still O(N) */
    
    var clusteredNodes = {};
    const nodesIterator = Object.keys(this.jfg.graph.nodes).values(); // O(N)
    
    let result = nodesIterator.next();
    while (!result.done) { //O(N)
        var nodeId = result.value;
        var node = this.jfg.graph.nodes[nodeId];
        if(nodeId in clustering_paths) {
            const clusterId = clustering_paths[nodeId]["cluster"];
            if(clusterId in clusteredNodes) {
                var cluster = clusteredNodes[clusterId];
                cluster["label"] = `${cluster["label"]}; ${node["label"]}`;
                cluster["metadata"]["clustered_metadata"][nodeId] = node["metadata"];
            } else {
                var clustered_metadata = {};
                clustered_metadata[nodeId] = node["metadata"];
                var cluster = {
                    "label": node["label"],
                    "metadata": {
                        "clustered": true,
                        "clustered_metadata": clustered_metadata
                    }
                };
                clusteredNodes[clusterId] = cluster;
            }
        } else {
            clusteredNodes[nodeId] = node;
        }
        result = nodesIterator.next();
    }
    //HmLog.hmLog("Clustered nodes");
    //HmLog.hmLog(JSON.stringify(clusteredNodes, null, 4));
    
    this.jfg.graph["nodes"] = clusteredNodes;
    
    /** BLOCK 1.5 Remapping edges */
    /** Again: linear O(E) */
    var nedges = [];
    var eDuplicationRegistry = {};
    for (var deidx in directed_edges) {
        var dedge = directed_edges[deidx];
        HmLog.hmLog(`Remapping directed edge ${JSON.stringify(dedge)}`);
        var source = dedge["source"];
        if (source in clustering_paths) source = clustering_paths[source]["cluster"];
        var target = dedge["target"];
        if (target in clustering_paths) target = clustering_paths[target]["cluster"];
        if(source == target) {
            HmLog.hmLog(`Pruning looping arc (${source}->${source})`);
            continue;
        }
        var nedge = Object.assign({}, dedge); //Shallow copy is ok
        nedge["source"] = source;
        nedge["target"] = target;
        const nedgeSignature = `${source}->${target}`;
        if (nedgeSignature in eDuplicationRegistry) {
            HmLog.hmLog(`Pruning duplicated arc ${nedgeSignature}`);
            continue;
        }
        eDuplicationRegistry[nedgeSignature] = true;
        HmLog.hmLog(`Adding remapped edge ${JSON.stringify(nedge)}`);
        nedges.push(nedge);
    }
    this.jfg.graph["edges"] = nedges;
    HmLog.hmLog("\n\n-------------------- CLUSTERED");
    HmLog.hmLog(JSON.stringify(this.jfg, null, 4));
    
    
    // Cycle check
    
    // TRED
    
    
    
    
    
    
    
}

module.exports = { CarafaGraph }


//The function has O(N) + O(E) complexity. O(E) is given by the touchCluster recursion
//Set([1,2,3]).values().next() O(1)
function buildClusters(map) {
    var clusterId = 0;
    const nodes = Object.keys(map).values(); // O(N) [values has O(1)]
    
    let result = nodes.next();
    while (!result.done) { //O(N)
        var nodeId = result.value;
        var node = map[nodeId];
        if(node.cluster == null) {
            node["cluster"] = `cluster_${clusterId}`;
            clusterId++;
            touchCluster(nodeId, node, map);
        }
        result = nodes.next();
    }
    
}

function touchCluster(nodeId, node, map) {
    //HmLog.hmLog(`Touching node ${nodeId}`);
    const edges = node["edges"].values(); // O(1)
    
    let result = edges.next();
    while (!result.done) { // O(E)
        var childId = result.value;
        var child = map[childId];
        //HmLog.hmLog(`Elaborating child ${childId}`);
        if(child.cluster) {
            //HmLog.hmLog(`Child belongs to ${child.cluster} - Skipping`);
        } else {
            //HmLog.hmLog(`Child gathered to ${node["cluster"]} - Visiting`);
            child["cluster"] = node["cluster"];
            touchCluster(childId, child, map);
        }
        result = edges.next();
    }
}
