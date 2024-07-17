const HMDJ = function(mapping) {
    this.id = "hmdj_" + new Date().getTime() + "_" + Math.floor(Math.random() * 100000000);
    this.mapping = mapping;
    
    this.nodes = {};
    
    this.describe = function() {
        console.log("HMDJ: " + this.id);
        console.log("HMDJ: " + this.stringify());
    }
    
    this.stringify = function(as_array) {
        var o2s = this.nodes;
        if (as_array == true) {
            o2s = Object.keys(this.nodes).map(key => this.nodes[key]);
        }
        return JSON.stringify(o2s, null, 4);
    }
    
    this.addContext = function(context, relationships) {
        var nodeIdKey = "id";
        if (mapping && "context_id" in mapping) { nodeIdKey = mapping["context_id"] }
        
        var rels = [];
        if(relationships) { rels = relationships; }
        
        if (nodeIdKey in context) {
            let nodeId = `${context[nodeIdKey]}`;
            this.nodes[nodeId] = {
                "id": nodeId,
                "relationships": rels
            }
            if (mapping) {
                if ("map_data" in mapping && mapping["map_data"] == true) { this.nodes[nodeId]["data"] = context; }
                if ("properties" in mapping) {
                    let propKey = mapping["properties"]["key"];
                    if(propKey in context) {
                        let propValue = context[propKey];
                        if (propValue in mapping["properties"]["values"]) {
                            this.nodes[nodeId]["properties"] = mapping["properties"]["values"][propValue];
                        }
                    }
                }
                var contextLabelKey = "label";
                if ("context_label" in mapping) { contextLabelKey = mapping["context_label"]; }
                if(context[contextLabelKey]) { this.nodes[nodeId]["label"] = context[contextLabelKey]; }
                var contextDescKey = "description";
                if ("context_description" in mapping) { contextDescKey = mapping["context_description"]; }
                if (context[contextDescKey]) { nodeIdKey = this.nodes[nodeId]["description"] = context[contextDescKey]; }
            }
        } else {
            console.error("Could not find context id");
        }
    }
}
module.exports = { HMDJ }
