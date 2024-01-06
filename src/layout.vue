<template>
	<div class="layout-harris-matrix">
		<div v-if="!loading">
			<div id="div-graph"></div>
		</div>
		<div id="info">
			<h2>
				<span id="context_id" class="type-title"></span>
				&nbsp;
				<span id="context_type"></span>
			</h2>
			<div id="context_description"></div>
			<div id="action_container">
				<div id="view_record"></div>
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

var collection = null;
var currentItems = [];
var graphItems = [];
var validTargets = [];
var currentGraph = null;
var currentSplines = 'ortho';
var currentConcentrated = false;
var currentContextType = null;
var nodesAttributes = {};
var consoleLogging = false;
var contextProps = {};

var refreshHandler = null;
var queryFieldsChangeHandler = null;

// FIELDS
var contextId_field = "";
var contextLabel_field = "";
var contentDescription_field = "";
var contextType_field = "";

var pk_field = "";

function resetInfo() {
	if (document.getElementById('context_id')) document.getElementById('context_id').innerHTML = "";
	if (document.getElementById('context_type')) document.getElementById('context_type').innerHTML = "";
	if (document.getElementById('context_description')) document.getElementById('context_description').innerHTML = "";
}

function closeInfo() {
	resetInfo();
	let svg = document.querySelector("#div-graph").querySelector('svg');
	if (svg) svg.style.opacity = 1;
	document.getElementById('info') && document.getElementById('info').style.display === 'block' ? document.getElementById('info').style.display = "none" : '';
}

function mapItems(items) {
	var mapped = []
	for (var ix in items) {
		let item = items[ix];
		let nitem = {
			"id": item[pk_field],
			"context_id": item[contextId_field],
			"label": item[contextLabel_field],
			"description": item[contentDescription_field],
			"context_type": item[contextType_field],
			"stratigraphy": item["stratigraphy"]
		}
		mapped.push(nitem);
	}
	return mapped;
}

function displayNodeInfos(node) {
	hmLog("[NODE INFO: " + node + "]");
	let nid = node.querySelector('title').textContent;
	let attrs = nodesAttributes[nid];

	document.getElementById('view_record').innerHTML = `<a href="./content/${collection}/${attrs.id}" style="cursor: pointer;">View record</a>`;

	document.getElementById('context_id').innerHTML = `${attrs.label}`;
	document.getElementById('context_type').innerHTML = `${attrs.context_type}`;
	document.getElementById('context_description').innerHTML = `${attrs.text}`;

	if (document.getElementById('info')) document.getElementById('info').style.display = "block";
	let svg = document.querySelector("#div-graph").querySelector('svg');
	if (svg) svg.style.opacity = 0.3;
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
		let digraph = `digraph { splines=${currentSplines}; concentrated=${currentConcentrated}; ${currentGraph} }`;
		hmLog("DIGRAPH V2:\n" + digraph);
		let svg = viz.renderSVGElement(digraph);
		item.appendChild(svg);
		[].forEach.call(document.querySelectorAll('g.node'), el => {
			el.addEventListener('click', function () {
				displayNodeInfos(el);
			});
		});
	});
	setTimeout(addZoomPan, 750);
}

function setValidTargtes() {
	//Loop effort to create a map
	validTargets = graphItems.reduce((obj, item) => {
		return {
			...obj,
			[item["context_id"]]: true,
		};
	}, {});
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

function prepareGraph() {
	let items = graphItems;
	setValidTargtes();

	nodesAttributes = {};
	hmLog('Vertex count: ' + items.length);

	var nodes = [];
	var arcs = [];

	for (var eidx in items) {
		let node = items[eidx];
		var nodeProps = [`shape="box"`];

		if (node.context_type && contextProps[node.context_type] != null) {
			hmLog("Adding " + contextProps[node.context_type] + " as node props");
			nodeProps = contextProps[node.context_type];
		}

		if (contextId_field != contextLabel_field) {
			let nl = node.label == null ? "-" : node.label;
			nodeProps.push(`label="${nl}"`);
		}
		nodes.push(`"${node["context_id"]}" [${nodeProps.join(",")}];`);
		nodesAttributes[node["context_id"]] = { "id": node.id, "label": node.label, "text": node.description, "context_type": node.context_type }; //Could not figure out how to access images

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
					} else if (['is filled by', 'is covered by', 'is cut by', 'carries'].includes(child["relationship"])) {
						relation = `"${otherContextId}" -> "${node["context_id"]}";`;
					} else if (['is the same as', 'is bound to'].includes(child["relationship"])) {
						relation = `"${otherContextId}" -> "${node["context_id"]}" [style="dashed", color="blue", dir="none"];`;
					} else {
						hmLog(`Not managed: ${child["relationship"]}`);
					}
				}

				if (!arcs.includes(relation)) {
					arcs.push(relation);
				}
			}
		}
	}

	currentGraph = nodes.join("\n") + "\n" + arcs.join("\n");
	//hmLog(currentGraph);
}

function hmLog(message) {
	if (consoleLogging != true) return;
	console.log("[HMLOG] - " + message);
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
			//hmLog("Adding '" + cprop + "' to " + cp[0]);
			console.log("Adding '" + cprop + "' to " + cp[0]);
			dict[cp[0]].push(cprop);
		}
	}
	return dict;
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
		contextProps: String,
		contextIdField: String,
		contextLabelField: String,
		contentDescriptionField: String,
		contextTypeField: String,
		primaryKeyFieldKey: String,
		queryFieldsChanged: Function,
		refresh: Function //VITAL!!!
	},
	watch: {
		items: {
			deep: true,
			immediate: true,
			handler: function (newVal, oldVal) {
				currentItems = mapItems(newVal);
				filterOut(); //Filtering inline
				prepareGraph();
				displayGraph();
			}
		},
		spline: function (newVal, oldVal) {
			currentSplines = newVal;
			displayGraph();
		},
		concentrated: function (newVal, oldVal) {
			currentConcentrated = newVal;
			displayGraph();
		},
		contextType: function (newVal, oldVal) {
			hmLog("Context type is now: " + newVal);
			currentContextType = newVal;
			filterOut(); //Filtering inline
			prepareGraph();
			displayGraph();
		},
		consoleLogging: function (newVal, oldVal) {
			console.log("Console log: " + (newVal == true ? "ON" : "OFF"));
			consoleLogging = newVal;
		},
		contextProps: function (newVal, oldVal) {
			hmLog("Redoing context props");
			contextProps = parseCProps(newVal);
			prepareGraph();
			displayGraph();
		},
		filter: function (newVal, oldVal) {
			//Refreshing after filter has changed
			setTimeout(function () { refreshHandler(); }, 500);
		},
		contextIdField: function (newVal, oldVal) {
			contextId_field = newVal;
			queryFieldsChangeHandler(contextId_field, contextLabel_field, contentDescription_field, contextType_field);
		},
		contextLabelField: function (newVal, oldVal) {
			contextLabel_field = newVal;
			queryFieldsChangeHandler(contextId_field, contextLabel_field, contentDescription_field, contextType_field);
		},
		contentDescriptionField: function (newVal, oldVal) {
			contentDescription_field = newVal;
			queryFieldsChangeHandler(contextId_field, contextLabel_field, contentDescription_field, contextType_field);
		},
		contextTypeField: function (newVal, oldVal) {
			contextType_field = newVal;
			queryFieldsChangeHandler(contextId_field, contextLabel_field, contentDescription_field, contextType_field);
		},
	},
	setup(props, context) {
		onMounted(() => {
			refreshHandler = props.refresh;
			queryFieldsChangeHandler = props.queryFieldsChanged;
			collection = props.collection;
			console.log("Mounted: " + props.collection);
			contextProps = parseCProps(props.contextProps);
			console.log("Contexts Props: " + JSON.stringify(contextProps));

			contextId_field = props.contextIdField;
			contextLabel_field = props.contextLabelField;
			contentDescription_field = props.contentDescriptionField;
			contextType_field = props.contextTypeField;
			pk_field = props.primaryKeyFieldKey;

			if (document.getElementById('info-close')) document.getElementById('info-close').addEventListener('click', function () {
				closeInfo();
			});

			if (document.getElementById('div-graph')) document.getElementById('div-graph').addEventListener('click', function () {
				closeInfo();
			});
		});
	},
};

</script>
