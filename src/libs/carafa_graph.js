import { Graph, alg } from "@dagrejs/graphlib";
import HmLog from "../utils/hmlog.js";

/**
 This implementation is not strictly compliant with the json graph format because uses some additional metadata expected to be in the jfg
 It should be cleaned up, to make it fully compliant
 */

const CarafaGraph = function(jgf, clusterProperties) {
    
    this.clusterProperties = clusterProperties;
    this.jfg = Object.assign({}, jgf); //Shallow copy is ok
    HmLog.hmLog("\n\n-------------------- PLAIN");
    HmLog.hmLog(JSON.stringify(this.jfg, null, 4));
    
    /** Filtering edges */
    /** Both operations are linear so this block doesnt' exceed O(E) */
    var directed_edges = this.jfg.graph.edges.filter((edge) => edge.directed == true);
    var clustering_edges = this.jfg.graph.edges.filter((edge) => edge.directed != true);
    
    const c_graph = clusteredGraph(this.jfg.graph.nodes, directed_edges, clustering_edges);
    
    /** Seatch for cycles */
    /** Usyally based on DFS algs. Should be O(N) + O(E)*/
    /** TODO: CHECK! */
    if (alg.isAcyclic(c_graph) == true) {
        HmLog.hmLog("Well done... It's an acyclic graph");
    } else {
        const cycles = JSON.stringify(alg.findCycles(c_graph));
        const raise = `Cycles have been detected: ${JSON.stringify(alg.findCycles(c_graph))}`;
        HmLog.hmLog(raise);
        throw raise;
    }
    
    this.g = transitiveReduction(c_graph);
    
    var cn_nodes = {};
    const cg_nodes = this.g.nodes();
    for (var nix in cg_nodes) { //O(N)
        var nodeId = cg_nodes[nix];
        var cn_node = this.g.node(nodeId);
        cn_nodes[nodeId] = {"label": cn_node["label"], "metadata": cn_node["metadata"]};
    }
    this.jfg.graph["directed"] = true;
    this.jfg.graph["nodes"] = cn_nodes;
    this.jfg.graph["edges"] = this.g.edges().map((x) => this.g.edge(x));
    
    
    HmLog.hmLog("\n\n-------------------- CLUSTERED");
    HmLog.hmLog(JSON.stringify(this.jfg, null, 4));
    
    // O(N + E) - It could be done inline [maybe later]
    this.dot = function() {
        var dot = [];
        const dot_nodes = this.g.nodes();
        for (var nix in dot_nodes) {
            var nodeId = dot_nodes[nix];
            var node = this.g.node(nodeId);
            var nodeProps = [];
            if (node["metadata"]) {
                if (node["metadata"]["clustered"] == true && clusterProperties) {
                    nodeProps = Object.assign([], clusterProperties);
                } else {
                    let cnp = node["metadata"]["properties"];
                    if(cnp) {
                        nodeProps = Object.assign([], cnp);
                    } else {
                        nodeProps = ["shape=\"box\""];
                    }
                }
                nodeProps.push(`label="${node["label"]}"`);
            }
            var nps = nodeProps.length == 0 ? "" : ` [${nodeProps.join(",")}]`;
            dot.push(`"${nodeId}"${nps};`);
        }
        
        dot.push("\n");
        
        const dot_edges = this.g.edges();
        for (var eix in dot_edges) {
            var dot_edge = dot_edges[eix];
            var edge = this.g.edge(dot_edge);
            var eLabel = "";
            if(edge["label"]) eLabel = ` [${edge["label"]}]`;
            dot.push(`"${edge["source"]}" -> "${edge["target"]}"${eLabel};`);
        }
        
        return dot;
    }
    
    // O(N + E) - It could be done inline [maybe later]
    this.nodesAttributes = function() {
        var nodesAttributes = {};
        const a_nodes = this.g.nodes();
        for (var nix in a_nodes) {
            var nodeId = a_nodes[nix];
            var node = this.g.node(nodeId);
            nodesAttributes[nodeId] = { "id": nodeId,
                "label": node["label"],
                "text": node["description"],
                "context_type": node["context_type"],
                "resource_id": node["resource_id"]
            }; //Could not figure out how to access images
            if (node["metadata"] && node["metadata"]["clustered"] == true) {
                nodesAttributes[nodeId]["clustered_metadata"] = node["metadata"]["clustered_metadata"];
            }
        }
        return nodesAttributes;
    }
    
}

function fromGfgNode(node) {
    var g_node = {
        "label": node["label"],
        "metadata": node["metadata"]
    };
    var c_infos = node["metadata"]["c_infos"];
    if (c_infos) {
        g_node["resource_id"] = c_infos["resource_id"];
        g_node["context_type"] = c_infos["context_type"];
        g_node["description"] = c_infos["description"];
    }
    return g_node;
}

//O(E) + O(N)
function clusteredGraph(nodes, edges, clustering_edges) {
    
    var tg = new Graph({ directed: false });
    
    const iterator = Object.keys(nodes).values(); // O(N)
    let result = iterator.next();
    while (!result.done) { //O(N)
        var nodeId = result.value;
        tg.setNode(nodeId);
        result = iterator.next();
    }
    
    for (var edgex in clustering_edges) { //O(E)
        var edge = clustering_edges[edgex];
        tg.setEdge(edge["source"], edge["target"]);
    }
    
    var clustered_g = new Graph({ directed: true });
    
    // O(E) [as per https://github.com/zmitry/graphlib/blob/master/README.md#alg-components]
    const components = alg.components(tg);
    
    // THIS WILL CYCLE ON ALL THE NODES (AT WORST) AND NO MORE, SO IT'S O(N)
    var clusterCounter = 0;
    var edgesRedirect = {};
    
    for (var cix in components) {
        const component = components[cix];
        if (component.length == 1) {
            // Single node
            let nodeId = component[0];
            let node = fromGfgNode(nodes[nodeId]);
            clustered_g.setNode(nodeId, node);
        } else {
            let clusterId = `cluster_${clusterCounter}`;
            clusterCounter++;
            
            var clustered_metadata = {};
            var clusterLabel = "";
            for (var cidx in component) {
                var nodeId = component[cidx];
                let node = fromGfgNode(nodes[nodeId]);
                clusterLabel += `${node["label"]}; `;
                clustered_metadata[nodeId] = {"metadata": node["metadata"]};
                edgesRedirect[nodeId] = clusterId;
                HmLog.hmLog(`Adding node ${nodeId} to cluster ${clusterId}`);
            }
            
            const cll = clusterLabel.trim();
            var cluster = {
                "label": cll,
                "description": `Clustering node (${cll})`,
                "context_type": "cluster",
                "metadata": {
                    "clustered": true,
                    "clustered_metadata": clustered_metadata
                }
            };
            clustered_g.setNode(clusterId, cluster);
        }
    }
    
    // O(E)
    var eDuplicationRegistry = {};
    for (var deidx in edges) {
        var dedge = edges[deidx];
        HmLog.hmLog(`Remapping directed edge ${JSON.stringify(dedge)}`);
        var source = dedge["source"];
        if (source in edgesRedirect) source = edgesRedirect[source];
        var target = dedge["target"];
        if (target in edgesRedirect) target = edgesRedirect[target];
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
        clustered_g.setEdge(source, target, nedge);
    }
    
    return clustered_g;
}

// TRED
// This should take O(N + E)
// It cycles on edges, then applies a dfs search to determine if the current edge is necessary or not
// It uses a caching map to avoid redundant checks, which should reduce complexity form O(E * (N + E)) to ~O(N + E) in most cases
// The worst case (i.e no caching support + complete graph) should be calculated as follows:
// -------
// On a complete graph the number of edges is E = N(N−1)/2, then O(E * (N + E)) ->
// O( (N(N-1)/2) * (N + (N(N-1)/2)) ) which leads to O(N^4). This - despite being purely theoretical - is absolutely unacceptable
// ERGO NEXT VERSION SHOULD ABSOLUTELY BE DEVELOPED AFTER CHECKING
// Aho et al. -> https://www.cs.tufts.edu/comp/150FP/archive/al-aho/transitive-reduction.pdf
function transitiveReduction(graph) {
    HmLog.hmLog("[TRED] - **************************** TRED");
    const reducedGraph = new Graph({ directed: true });
    
    // O(N + E)
    graph.nodes().forEach(node => reducedGraph.setNode(node, graph.node(node)));
    graph.edges().forEach(({ v, w }) => reducedGraph.setEdge(v, w));

    const pathCache = new Map();

    // Remove redundancies
    // hasPath stes on O(N + E) but it multiplies for E
    // The caching map should reduce.
    graph.edges().forEach(({ v, w }) => {
        reducedGraph.removeEdge(v, w);

        HmLog.hmLog(`[TRED] - Testing edge ${v}->${w} -----------------------`);
        
        // Is there any path without it?
        if (hasPath(reducedGraph, v, w, pathCache) == false) {
            //Nope, let's reintegrate the edge
            reducedGraph.setEdge(v, w, graph.edge(v, w));
            HmLog.hmLog(`[TRED] ${v}->${w} is necessary! -----------------------`);
        } else {
            HmLog.hmLog(`[TRED] ${v}->${w} is redundant! -----------------------`);
        }
    });

    HmLog.hmLog("[TRED] - **************************** TRED");
    return reducedGraph;
}



// DFS + caching (Using dfs should be on O(N + E)
function hasPath(graph, start, end, pathCache) {
    const cacheKey = `${start}-${end}`;
    if (pathCache.has(cacheKey)) return pathCache.get(cacheKey);

    const visited = new Set();
    const result = dfs(graph, start, end, visited);

    // Caching and returning a response
    pathCache.set(cacheKey, result);
    return result;
}

// DFS calculus which has O(N + E)
function dfs(graph, current, end, visited) {
    if (current === end) {
        HmLog.hmLog(`[TRED] FOUND ${end}!`);
        return true;
    }
    visited.add(current);

    for (const successor of graph.successors(current)) {
        if (visited.has(successor) == true) { continue; }
        if (dfs(graph, successor, end, visited) == true) { return true; }
    }

    return false;
}

//module.exports = { CarafaGraph }
export default CarafaGraph
