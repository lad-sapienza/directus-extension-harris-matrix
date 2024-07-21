// This tool builds a Json Graph Format based on the schema proposed by JsonGraphFormat (JGF)
// https://jsongraphformat.info/v2.0/json-graph-schema.json

var HmLog = require("./hmlog.js");

const JGF = function(config) {
    const date = new Date();
    var dateString = ("0" + date.getDate()).slice(-2) + "/" +
            ("0" + (date.getMonth()+1)).slice(-2) + "/" +
            date.getFullYear() + " " +
            ("0" + date.getHours()).slice(-2) + ":" +
            ("0" + date.getMinutes()).slice(-2) + ":" +
            ("0" + date.getSeconds()).slice(-2);
    
    this.id = "jgf_" + date.getTime() + "_" + Math.floor(Math.random() * 100000000);
    this.config = config;
    this.closed = false;
    
    if (config && "multi" in config && config["multi"] == false) {
        this.pruneMap = {};
    }
    
    
    
    this.graph = {
        "graph": {
            "id": this.id,
            "label": `JGF produced at ${dateString}`,
            "directed": false,
            "type": "",
            "metadata": {},
            "nodes": {},
            "edges": []
        }
    };
    
    this.close = function() {
        this.closed = true;
    }
    
    this.describe = function() {
        HmLog.hmLog("JGF: " + this.id);
        HmLog.hmLog("JGF: " + this.stringify());
    }
    
    this.stringify = function(as_array) {
        return JSON.stringify(this.graph, null, 4);
    }
    
    this.addNode = function(node) {
        
        if(this.closed == true) {
            HmLog.hmLog("Graph is closed. Could not add node");
            return
        }
        
        var nodeIdKey = "id";
        if (config && "context_id" in config) { nodeIdKey = config["context_id"] }
        
        if (nodeIdKey in node) {
            let nodeId = `${node[nodeIdKey]}`;
            this.graph.graph.nodes[nodeId] = {
                "resource_id": node.id,
                "metadata": {}
            }
            
            if (config) {
                var contextLabelKey = "label";
                if ("context_label" in config) { contextLabelKey = config["context_label"]; }
                if(node[contextLabelKey]) { this.graph.graph.nodes[nodeId]["label"] = node[contextLabelKey]; }
                
                //I also need the context type in metadata
                var contextTypeKey = "context_type";
                if ("context_type" in config) { contextTypeKey = config["context_type"]; }
                if (node[contextTypeKey]) { this.graph.graph.nodes[nodeId]["context_type"] = node[contextTypeKey]; }

                var contextDescKey = "description";
                if ("context_description" in config) { contextDescKey = config["context_description"]; }
                if (node[contextDescKey]) { this.graph.graph.nodes[nodeId]["description"] = node[contextDescKey]; }
                
                if ("properties" in config) {
                    let propKey = config["properties"]["key"];
                    if(propKey in node) {
                        let propValue = node[propKey];
                        if (propValue in config["properties"]["values"]) {
                            this.graph.graph.nodes[nodeId]["metadata"]["properties"] = config["properties"]["values"][propValue];
                        }
                    }
                }
                
                if ("map_data" in config && config["map_data"] == true) {
                    this.graph.graph.nodes[nodeId]["data"] = node;
                }
            }
        } else {
            console.error("Could not find node id");
        }
    }
    
    this.addEdge = function(edge) {
        if(this.closed == true) {
            HmLog.hmLog("Graph is closed. Could not add edge");
            return
        }
        
        if (!("source" in edge)) {
            HmLog.hmLog("Could not find edge source");
            return;
        }
        if (!("target" in edge)) {
            HmLog.hmLog("Could not find edge source");
            return;
        }
        
        if (!("allow_looping_nodes" in config) || config["allow_looping_nodes"] == false) {
            if (edge["source"]==edge["target"]) {
                HmLog.hmLog(`Unallowed node looping over node ${edge["source"]}`);
                return;
            }
        }
        
        var directed = "directed" in edge && edge["directed"] == true;
        var relation = "relation" in edge ? edge["relation"] : null;
        var edgeSignature = "";
        if (this.pruneMap) {
            var rel = relation == null ? "" : relation;
            edgeSignature = `${edge["source"]}-${rel}-${edge["target"]}`;
            if (edgeSignature in this.pruneMap) {
                HmLog.hmLog(`Edge signature ${edgeSignature} has been autopruned`);
                return
            }
            if (directed == false) {
                let reverseEdgeSignature = `${edge["target"]}-${rel}-${edge["source"]}`;
                if (reverseEdgeSignature in this.pruneMap) {
                    HmLog.hmLog(`Edge signature ${reverseEdgeSignature} has been autopruned`);
                    return
                }
                this.pruneMap[reverseEdgeSignature] = true;
                HmLog.hmLog(`Reverse edge signature ${reverseEdgeSignature} has been tracked`);
            }
            this.pruneMap[edgeSignature] = true;
            HmLog.hmLog(`Edge signature ${edgeSignature} has been tracked`);
        }
        this.graph.graph.edges.push(edge);
        HmLog.hmLog(`Edge signature ${edgeSignature} has been added`);
    }
    
    
}
module.exports = { JGF }
