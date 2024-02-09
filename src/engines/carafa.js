const engineVersion = function() {
	return "Carafa engine *** v0.1 ***";
}

const prepareGraph = function(graphItems, contextProps) {
	return {"graph": nodes.join("\n") + "\n" + arcs.join("\n"), "attributes": nodesAttributes};
}

module.exports = { engineVersion, prepareGraph }
