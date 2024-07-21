import { Graph, alg } from "@dagrejs/graphlib";
import HmLog from "../utils/hmlog.js";

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
        const cycles = JSON.stringify(alg.findCycles(this.g));
        const raise = `Cycles: ${JSON.stringify(alg.findCycles(this.g))}`;
        HmLog.hmLog(raise);
        throw raise;
    }
    
    this.g = transitiveReduction(c_graph);
    
    var cn_nodes = {};
    const cg_nodes = this.g.nodes();
    for (var nix in cg_nodes) { //O(N)
        var nodeId = cg_nodes[nix];
        cn_nodes[nodeId] = this.g.node(nodeId);
    }
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
                    nodeProps = Object.assign([], node["metadata"]);
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
    
    for (var edgex in clustering_edges) { //O(N)
        var edge = clustering_edges[edgex];
        tg.setEdge(edge["source"], edge["target"]);
    }
    
    var clustered_g = new Graph({ directed: true });
    
    // O(E) [as per https://github.com/zmitry/graphlib/blob/master/README.md#alg-components]
    const components = alg.components(tg);
    
    // THIS WILL CYCLE ON ALL THE NODES AND NO MORE, SO IT'S O(N)
    var clusterCounter = 0;
    var edgesRedirect = {};
    
    for (var cix in components) {
        const component = components[cix];
        if (component.length == 1) {
            // Single node
            let nodeId = component[0];
            let node = nodes[nodeId];
            clustered_g.setNode(nodeId, node);
        } else {
            let clusterId = `cluster_${clusterCounter}`;
            clusterCounter++;
            
            var clustered_metadata = {};
            var clusterLabel = "";
            for (var cidx in component) {
                var nodeId = component[cidx];
                let node = nodes[nodeId];
                clusterLabel += `${node["label"]}; `;
                clustered_metadata[nodeId] = {"metadata": node["metadata"], "resource_id": node.resource_id};
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
// This should take O(N * E)
// Cycling on nodes, then applying a dfs search to determine if the edge is necessary or not
// It uses a caching map to avoid redundant checks, which should reduce complexity form O(E * (N * E)) in most cases
// ABSOLUTELY CHECK https://www.cs.tufts.edu/comp/150FP/archive/al-aho/transitive-reduction.pdf
function transitiveReduction(graph) {
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

        // Is there any path without it?
        if (hasPath(reducedGraph, v, w, pathCache) == false) {
            //Nope, let's reintegrate the edge
            reducedGraph.setEdge(v, w, graph.edge(v, w));
        }
    });

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
    if (current === end) return true;
    visited.add(current);

    for (const successor of graph.successors(current)) {
        if (visited.has(successor) == false) {
            return dfs(graph, successor, end, visited);
        }
    }

    return false;
}

//module.exports = { CarafaGraph }
export default CarafaGraph
