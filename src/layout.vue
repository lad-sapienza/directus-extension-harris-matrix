<template>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
	<div class="layout-harris-matrix">
		<div v-if="!loading">
			<div id="div-graph"></div>
            <a id="download-anchor" download="hmdj.json" title="download your hmdj file"><i class="fa-solid fa-download"></i></a>
		</div>
		<div id="info">
			<h2>
				<span id="context_id" class="type-title"></span>
				&nbsp;
				<span id="context_type"></span>
			</h2>
			<div id="context_description"></div>
			<div id="action_container">
				<div><span id="info-close">Close</span></div>
			</div>
		</div>
	</div>
</template>

<style lang="css">
#div-graph svg {
	width: 100% !important;
	height: 100% !important;
	border: dashed 1px var(--background-normal-alt);

	g.node {
		cursor: pointer;
	}
}
</style>

<style lang="css" scoped>
.layout-harris-matrix {
	position: relative;
	width: 90%;
	height: calc(100% - 120px);
}

#div-graph {
	width: calc(100% - var(--content-padding)) !important;
	margin-left: var(--content-padding);
	height: calc(100vh - 120px);
}

#info {
	display: none;
	margin-left: var(--content-padding);
	margin-top: 30px;

	float: left;
	background-color: var(--background-highlight);
	border: solid 1pt var(--background-normal-alt);
	width: 70% !important;
	position: relative;
	left: 15%;
	top: -70%;
	max-height: 500px;

	padding: 2rem;
}

#action_container {
	display: flex;
	justify-content: space-between;
	margin-top: 1rem;
	padding-top: 1rem;
	border-top: 1px solid var(--background-normal-alt);
}

#info-close {
	margin: 10px;
	cursor: pointer;
}

#download-anchor {
    top: 10px;
    left: calc(var(--content-padding) + 10px);
    position: absolute;
    padding: 4px;
    background-color: var(--v-button-background-color);
    border-radius: 5px;
    width: 2vw;
    text-align: center;
    cursor: pointer;
}

#download-anchor i {
    color: white;
}
</style>

<script>
// https://github.com/codihaus/directus-extension-grid-layout/blob/main/src/options.vue

import { onMounted } from 'vue';
import { toRefs, toRef } from 'vue';
import { instance } from "@viz-js/viz";
import { useItems, useCollection, useSync } from '@directus/extensions-sdk';
import { useApi, useStores } from '@directus/extensions-sdk';
import svgPanZoom from "svg-pan-zoom";
import { getCurrentInstance } from 'vue';

import { setHmLogging,  hmLog } from './utils/hmlog.js';

import * as StandardEngine from './engines/standard.js';
import * as CarafaEngine from './engines/carafa.js';

var collection = null;
var currentItems = [];
var graphItems = [];
var currentGraph = null;
var currentSplines = 'ortho';
var currentConcentrated = false;
var currentContextType = null;
var nodesAttributes = {};
var contextProps = {};

var refreshHandler = null;
var optFieldsChangedHandler = null;

// FIELDS
var contextIdField = "";
var contextLabelField = "";
var contentDescriptionField = "";
var contextTypeField = "";

var pkField = "";

let toogleInfo = false;


var graphEngine = "standard";

var prepareGraph = function() { hmLog("******** ENGINE NOT SET *********"); }
var engineVersion = "******** ENGINE NOT SET *********";
var fetchDataPackage = null;

function setEngine() {
    if(graphEngine == "standard") {
		prepareGraph = StandardEngine.prepareGraph;
		engineVersion = StandardEngine.engineVersion;
        fetchDataPackage = null;
	} else if(graphEngine == "carafa") {
		prepareGraph = CarafaEngine.prepareGraph;
		engineVersion = CarafaEngine.engineVersion;
        fetchDataPackage = CarafaEngine.fetchDataPackage;
	} else {
		prepareGraph = function() { hmLog("******** ENGINE NOT SET *********"); }
		engineVersion = "******** ENGINE NOT SET *********";
        fetchDataPackage = null;
	}
	hmLog("Engine set!");
	hmLog(engineVersion);
}

function buildGraph() {
    hmLog('===== BUILD GRAPH CALLED v2.0.22-DEBUG =====');
    hmLog('graphItems count:', graphItems.length);
    let now = new Date().getTime();
	let graphElaboration = prepareGraph(graphItems, contextProps);
    hmLog('prepareGraph returned:', graphElaboration);
    let elapsed = new Date().getTime() - now;
    hmLog("Benchmark: " + graphItems.length + " items; " + elapsed + " ms;");
    if(graphElaboration) {
		currentGraph = graphElaboration.graph;
		nodesAttributes = graphElaboration.attributes;
	}
    setTimeout(setDownloadButton, 1000);
}

function setDownloadButton() {
    if (document.getElementById('download-anchor')) {
        if(fetchDataPackage) {
            var dataPackage = fetchDataPackage(false);
            hmLog("Data package:");
            hmLog(dataPackage);
            
            const m = new Date();
            var dateString = m.getUTCFullYear() + "-" +
                    ("0" + (m.getUTCMonth()+1)).slice(-2) + "-" +
                    ("0" + m.getUTCDate()).slice(-2) + "-" +
                    ("0" + m.getHours()).slice(-2) + "." +
                    ("0" + m.getMinutes()).slice(-2) + "." +
                    ("0" + m.getSeconds()).slice(-2);
            
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(dataPackage);
            document.getElementById('download-anchor').href = dataStr;
            document.getElementById('download-anchor').download = `c_export-${dateString}.json`;
            document.getElementById('download-anchor').style.display = "block";
        } else {
            document.getElementById('download-anchor').style.display = "none";
        }
    }
}

function resetInfo() {
	if (document.getElementById('context_id')) document.getElementById('context_id').innerHTML = "";
	if (document.getElementById('context_type')) document.getElementById('context_type').innerHTML = "";
	if (document.getElementById('context_description')) document.getElementById('context_description').innerHTML = "";
}

function closeInfo() {
	resetInfo();
	let svg = document.querySelector("#div-graph").querySelector('svg');
	if (svg) svg.style.opacity = 1;
	if (document.getElementById('info')) document.getElementById('info').style.display = "none";
}

function mapItems(items) {
	var mapped = []
	for (var ix in items) {
		let item = items[ix];
		let nitem = {
			"id": item[pkField],
			"context_id": item[contextIdField],
			"label": item[contextLabelField],
			"description": item[contentDescriptionField],
			"context_type": item[contextTypeField],
			"stratigraphy": mapStratigraphy(item["stratigraphy"])
		}
		if(contextIdField != contextLabelField) {
			let nl = item[contextLabelField] == null ? "-" : item[contextLabelField];
			nitem["label"] = nl;
		}
		mapped.push(nitem);
	}
	return mapped;
}

function mapStratigraphy(stratigraphyObject) {
	if (contextIdField == "context_id") return stratigraphyObject;
	var ns = {};
	for (let si in stratigraphyObject) {
		var stratigraphy = stratigraphyObject[si];
		if (stratigraphy["this_context"][contextIdField]) {
			stratigraphy["this_context"]["context_id"] = stratigraphy["this_context"][contextIdField];
			delete stratigraphy["this_context"][contextIdField];
		}
		if (stratigraphy["other_context"][contextIdField]) {
			stratigraphy["other_context"]["context_id"] = stratigraphy["other_context"][contextIdField];
			delete stratigraphy["other_context"][contextIdField];
		}
		ns[si] = stratigraphy;
	}
	return ns;
}

function displayNodeInfos(node) {
	let nid = node.querySelector('title').textContent;
	let attrs = nodesAttributes[nid];


    if(document.getElementById('action_container')) {
        document.querySelectorAll('.resource_linker').forEach(e => e.remove());
        if (attrs.context_type == "cluster" && "clustered_metadata" in attrs) {
            // TODO: Fix cluster visualization of linked resources
            var cmks = Object.keys(attrs["clustered_metadata"]).reverse();
            for (var cmk in cmks) {
                let key = cmks[cmk];
                let resource_id = attrs["clustered_metadata"][key]["metadata"]["c_infos"]["resource_id"];
                prependRecordLink(document.getElementById('action_container'), {"id": resource_id, "label": key});
            }
        } else {
            prependRecordLink(document.getElementById('action_container'), {"id": attrs.resource_id});
        }
    }

	document.getElementById('context_id').innerHTML = `${attrs.label}`;
	document.getElementById('context_type').innerHTML = `${attrs.context_type}`;
	document.getElementById('context_description').innerHTML = `${attrs.text}`;

	let svg = document.querySelector("#div-graph").querySelector('svg');
	if (svg) svg.style.opacity = 0.3;
	if (document.getElementById('info')) document.getElementById('info').style.display = "block";

}

function prependRecordLink(to, attrs) {
        let label = attrs.label == null ? "record" : attrs.label;
        let div = document.createElement("div");
        div.classList.add("resource_linker");
        div.innerHTML = `<a href="./content/${collection}/${attrs.id}" style="cursor: pointer;">View ${label}</a>`;
        to.prepend(div);
}

function addZoomPan() {
	let svg = document.querySelector("#div-graph").querySelector('svg');
	let panZoom = svgPanZoom(svg, {
		zoomEnabled: true,
		controlIconsEnabled: true,
		fit: true,
		center: true,
		minZoom: 0.1
	});
	svg.addEventListener('paneresize', function (e) {
		panZoom.resize();
	}, false);
	window.addEventListener('resize', function (e) {
		panZoom.resize();
	});
}


function displayGraph() {
	
	resetInfo();
	instance().then(function (viz) {
		const item = document.querySelector("#div-graph");
		while (item.firstChild) {
			item.removeChild(item.firstChild)
		}
		if (currentGraph) {
			let digraph = `digraph { splines=${currentSplines}; concentrated=${currentConcentrated}; ${currentGraph} }`;
			hmLog("DIGRAPH V2 length: " + digraph.length + "\n" + digraph);
			let svg = viz.renderSVGElement(digraph);
			item.appendChild(svg);
			[].forEach.call(document.querySelectorAll('g.node'), el => {
				el.addEventListener('click', function () {
					displayNodeInfos(el);
				});
			});
		}
	});
	setTimeout(addZoomPan, 750);
}


function parseCProps(cprops) {
	hmLog("Parsing context props");
	var dict = {};
	let cps = cprops.split("\n");
	for (var cpsi in cps) {
		let cp = cps[cpsi].split("$");
		if (cp.length != 2) continue;
		dict[cp[0]] = [];
		let propz = cp[1].split(";");
		for (var propzi in propz) {
			var cprop = propz[propzi].split("=");
			if (cprop.length != 2) continue;
			cprop = cprop[0] + "=\"" + cprop[1] + "\"";
			hmLog("Adding '" + cprop + "' to " + cp[0]);
			dict[cp[0]].push(cprop);
		}
	}
	return dict;
}

//Better on nodes than on arcs (arcs should be O(N^2)) - Needed when filtering inline
function filterOut() {
	if (currentContextType) {
		graphItems = [];
		for (var eidx in currentItems) {
			let node = currentItems[eidx];
			let contextType = node.context_type;
			if (contextType) {
				if (contextType == currentContextType) {
					hmLog("Enrolling " + node["context_id"]);
					graphItems.push(node);
				} else {
					hmLog("Discarding " + node["context_id"] + " (filtered out)");
				}
			} else if (currentContextType == "---no-context") {
				hmLog("Enrolling " + node["context_id"] + " (no context type)");
				graphItems.push(node);
			} else {
				hmLog("Discarding " + node["context_id"] + " (no context type)");
			}
		}
	} else {
		//No current content type... Enrolling all nodes
		graphItems = currentItems;
	}
}


export default {
	inheritAttrs: false,
	props: {
		collection: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		items: Array,
		loading: Boolean,
		error: Array,
		search: {
			type: String,
			default: null,
		},
		spline: {
			type: String,
			default: 'ortho',
		},
		concentrated: {
			type: Boolean,
			default: false,
		},
		consoleLogging: {
			type: Boolean,
			default: false,
		},
		contextType: {
			type: String,
			default: null,
		},
		filter: {
			type: String,
			default: null,
		},
		graphEngine: {
			type: String,
			default: "standard",
		},
		contextProps: String,
		contextIdField: String,
		contextLabelField: String,
		contentDescriptionField: String,
		contextTypeField: String,
		primaryKeyFieldKey: String, 
		optFieldsChanged: Function,
		refresh: Function //VITAL!!!
	},
	watch: {
		items: {
			deep: true,
			immediate: true,
			handler: function (newVal, oldVal) {
				currentItems = mapItems(newVal);
				filterOut();
				buildGraph();
				displayGraph();
			}
		},
        spline: function(newVal, oldVal) {
            currentSplines = newVal;
			optFieldsChangedHandler("spline", currentSplines, false);
            displayGraph();
        },
        concentrated: function(newVal, oldVal) {
            currentConcentrated = newVal;
			optFieldsChangedHandler("concentrated", currentConcentrated, false);
            displayGraph();
        },
        contextType: function(newVal, oldVal) {
			hmLog("Context type is now: " + newVal);
			currentContextType = newVal;
			optFieldsChangedHandler("contextType", currentContextType, false);
            filterOut();
            buildGraph();
            displayGraph();
        },
        consoleLogging: function(newVal, oldVal) {
			
      setHmLogging(newVal);
			optFieldsChangedHandler("consoleLogging", newVal, false);
        },
		contextProps: function(newVal, oldVal) {
			hmLog("Redoing context props");
			optFieldsChangedHandler("contextProps", newVal, false);
			contextProps = parseCProps(newVal);
			buildGraph();
			displayGraph();
		},
		filter: function (newVal, oldVal) {
			//Refreshing after filter has changed
			setTimeout(function () { refreshHandler(); }, 500);
		},
		contextIdField: function (newVal, oldVal) {
			contextIdField = newVal;
			optFieldsChangedHandler("contextIdField", contextIdField, true);
        },
		contextLabelField: function(newVal, oldVal) {
			contextLabelField = newVal;
			optFieldsChangedHandler("contextLabelField", contextLabelField, true);
        },
		contentDescriptionField: function(newVal, oldVal) {
			contentDescriptionField = newVal;
			optFieldsChangedHandler("contentDescriptionField", contentDescriptionField, true);
        },
		contextTypeField: function(newVal, oldVal) {
			contextTypeField = newVal;
			optFieldsChangedHandler("contextTypeField", contextTypeField, true);
        },
        graphEngine: function(newVal, oldVal) {
			graphEngine = newVal;
			optFieldsChangedHandler("graphEngine", graphEngine, false);
			setEngine();
			filterOut();
            buildGraph();
            displayGraph();
        }
    },
    setup(props, context) {
	    onMounted(() => {
			refreshHandler = props.refresh;
			optFieldsChangedHandler = props.optFieldsChanged;
			collection = props.collection;
			hmLog("Mounted: " + props.collection);
			// Debug info: show configured field names and initial items
			hmLog('[HM mount] configured fields: primaryKeyFieldKey=' + props.primaryKeyFieldKey + 
				', contextIdField=' + props.contextIdField +
				', contextLabelField=' + props.contextLabelField +
				', contentDescriptionField=' + props.contentDescriptionField +
				', contextTypeField=' + props.contextTypeField +
				', graphEngine=' + props.graphEngine);
		contextProps = parseCProps(props.contextProps);			contextIdField = props.contextIdField;
			contextLabelField = props.contextLabelField;
			contentDescriptionField = props.contentDescriptionField;
			contextTypeField = props.contextTypeField;
			pkField = props.primaryKeyFieldKey;
			
			if (document.getElementById('info-close')) document.getElementById('info-close').addEventListener('click', function() {
		        closeInfo();
		    });
			
			// PERSISTENCE
			currentSplines = props.spline;
			currentConcentrated = props.currentConcentrated;
			currentContextType = props.contextType;
			graphEngine = props.graphEngine;

			let clState = props.consoleLogging == true ? "ON" : "OFF";
			setHmLogging(props.consoleLogging);
			hmLog(`Setting console logging: ${clState}`);
			hmLog("Setting engine...");
			setEngine();
		});
	},
};

</script>
