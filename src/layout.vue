<template>
	<div class="layout-harris-matrix">
		<div v-if="!loading">
	        <div id="div-graph"></div>
	    </div>
		<div id="info">
			<table>
				<tr>
					<td id="us-link-td" rowspan="2"><span id="us-link-aspan"></span><br><span id="us-link-cspan"></span></td>
					<td id="inflo-close-td"><span id="info-close">close</span></td>
				</tr>
				<tr id="us-desc-desc-tr">
					<td id="us-desc-td"><span id="us-desc-dspan"></span></td>
				</tr>
			</table>
		</div>
	</div>
</template>

<style lang="css">
	#div-graph svg { 
		width: 100% !important;
		height: 100% !important;
		border: dashed 2pt var(--background-normal);

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
		background-color: white;
		border: solid 1pt gray;
		width: 70% !important;
		position: relative;
		left: 15%;
		top: -70%;
		height: 40%;
	}
	
	#info table { width: 100%; height: 100%; }
	#info table td { vertical-align: top; }
	#us-link-td { 
		width: 15%; 
		text-align: center; 
		padding-top: 10px;
		border-right: dotted 2pt gray;
	}
	#inflo-close-td {
		text-align: right;
		border-bottom: dotted 2pt gray;
	}
	#info-close {
		margin: 10px;
		cursor: pointer;
	}
	#us-link-aspan { 
		font-weight: bolder;
		text-decoration: underline;
		font-size: 1.8em;
	}
	#us-desc-desc-tr {
		height: 90%;
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
var optFieldsChangedHandler = null;


// FIELDS
var contextId_field = "";
var contextLabel_field = "";
var contentDescription_field = "";
var contextType_field = "";

var pk_field = "";

function resetInfo() {
    if (document.getElementById('us-link-aspan')) document.getElementById('us-link-aspan').innerHTML = "";
    if (document.getElementById('us-link-cspan')) document.getElementById('us-link-cspan').innerHTML = "";
    if (document.getElementById('us-desc-dspan')) document.getElementById('us-desc-dspan').innerHTML = "";
}

function closeInfo() {
	resetInfo();
	let svg = document.querySelector("#div-graph").querySelector('svg');
	if(svg) svg.style.opacity = 1;
	if (document.getElementById('info')) document.getElementById('info').style.display = "none";
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
	document.getElementById('us-link-aspan').innerHTML = `<a href="./content/${collection}/${attrs.id}" style="cursor: pointer;">${nid}</a>`;
	var cType = attrs.context_type == null ? "-" : attrs.context_type;
	document.getElementById('us-link-cspan').innerHTML = `${attrs.label} (<i>${cType}</i>)`;
	document.getElementById('us-desc-dspan').innerHTML = `${attrs.text}`;

	if (document.getElementById('info')) document.getElementById('info').style.display = "block";
	let svg = document.querySelector("#div-graph").querySelector('svg');
	if(svg) svg.style.opacity = 0.3;
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
    svg.addEventListener('paneresize', function(e) {
        panZoom.resize();
    }, false);
    window.addEventListener('resize', function(e) {
        panZoom.resize();
    });
}
 

function displayGraph() {
  resetInfo();
  instance().then(function(viz) {
    const item = document.querySelector("#div-graph");
    while (item.firstChild) {
      item.removeChild(item.firstChild)
    }
    let digraph = `digraph { splines=${currentSplines}; concentrated=${currentConcentrated}; ${currentGraph} }`;
    hmLog("DIGRAPH V2:\n" + digraph);
    let svg = viz.renderSVGElement(digraph);
    item.appendChild(svg);
    [].forEach.call(document.querySelectorAll('g.node'), el => {
      el.addEventListener('click', function() {
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
		
		if(node.context_type && contextProps[node.context_type] != null) {
			hmLog("Adding " + contextProps[node.context_type] + " as node props");
			nodeProps = contextProps[node.context_type];
		}
		
		if (contextId_field != contextLabel_field) {
			let nl = node.label == null ? "-" : node.label;
			nodeProps.push(`label="${nl}"`);
		}
		nodes.push(`"${node["context_id"]}" [${nodeProps.join(",")}];`);
        nodesAttributes[node["context_id"]] = {"id": node.id, "label": node.label, "text": node.description, "context_type": node.context_type}; //Could not figure out how to access images

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
	if(consoleLogging != true) return;
	console.log("[HMLOG] - " + message);
}

function parseCProps(cprops) {
    hmLog("Parsing context props");
    var dict = {};
    let cps = cprops.split("\n");
    for (var cpsi in cps) {
        let cp = cps[cpsi].split("$");
		if(cp.length != 2) continue;
        dict[cp[0]] = [];
        let propz = cp[1].split(";");
        for (var propzi in propz) {
		    var cprop = propz[propzi].split("=");
            if(cprop.length != 2) continue;
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
		optFieldsChanged: Function,
		refresh: Function //VITAL!!!
	},
    watch: {
		items: {
		  deep: true,
		  immediate: true,
		  handler: function(newVal, oldVal) {
             currentItems = mapItems(newVal);
			 filterOut(); //Filtering inline
             prepareGraph();
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
            filterOut(); //Filtering inline
            prepareGraph();
            displayGraph();
        },
        consoleLogging: function(newVal, oldVal) {
			console.log("Console log: " + (newVal == true ? "ON" : "OFF"));
            consoleLogging = newVal;
			optFieldsChangedHandler("consoleLogging", consoleLogging, false);
        },
		contextProps: function(newVal, oldVal) {
			hmLog("Redoing context props");
			optFieldsChangedHandler("contextProps", newVal, false);
			contextProps = parseCProps(newVal);
			prepareGraph();
			displayGraph();
        },
		filter: function(newVal, oldVal) {
			//Refreshing after filter has changed
			setTimeout(function() { refreshHandler(); }, 500);
        },
		contextIdField: function(newVal, oldVal) {
			contextId_field = newVal;
			optFieldsChangedHandler("contextIdField", contextId_field, true);
        },
		contextLabelField: function(newVal, oldVal) {
			contextLabel_field = newVal;
			optFieldsChangedHandler("contextLabelField", contextLabel_field, true);
        },
		contentDescriptionField: function(newVal, oldVal) {
			contentDescription_field = newVal;
			optFieldsChangedHandler("contentDescriptionField", contentDescription_field, true);
        },
		contextTypeField: function(newVal, oldVal) {
			contextType_field = newVal;
			optFieldsChangedHandler("contextTypeField", contextType_field, true);
        },
    },
    setup(props, context) {
	    onMounted(() => {
			refreshHandler = props.refresh;
			optFieldsChangedHandler = props.optFieldsChanged;
			collection = props.collection;
			console.log("Mounted: " + props.collection);
			contextProps = parseCProps(props.contextProps);
			console.log("Contexts Props: " + JSON.stringify(contextProps));
			
			contextId_field = props.contextIdField;
			contextLabel_field = props.contextLabelField;
			contentDescription_field = props.contentDescriptionField;
			contextType_field = props.contextTypeField;
			pk_field = props.primaryKeyFieldKey;
			
			if (document.getElementById('info-close')) document.getElementById('info-close').addEventListener('click', function() {
		        closeInfo();
		    });
			
			if (document.getElementById('div-graph')) document.getElementById('div-graph').addEventListener('click', function() {
		        closeInfo();
		    });
			
			// PERSISTENCE
			currentSplines = props.spline;
			currentConcentrated = props.currentConcentrated;
			consoleLogging = props.consoleLogging;
			currentContextType = props.contextType;
		});
    },
};

</script>
