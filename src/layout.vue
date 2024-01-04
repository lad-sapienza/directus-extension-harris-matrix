<template>
	<div class="layout-harris-matrix">
		<div v-if="!loading">
	        <div id="div-graph"></div>
	    </div>
		<div id="info">
			<table>
				<tr>
					<td id="us-link-td"><span id="us-link-aspan"></span><br><span id="us-link-cspan"></span></td>
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
		height: calc(70vh - 120px);
	}
    
	#info { 
		width: calc(100% - var(--content-padding)) !important;
		margin-left: var(--content-padding);
		margin-top: 30px;
		border-top: solid 3pt var(--background-normal);
	}
	
	#info table { width: 100%; margin-top: 10px; }
	#info table td { vertical-align: top; }
	#us-link-td { width: 15%; text-align: right; padding-right: 15px; }
	#us-link-aspan { 
		font-weight: bolder;
		text-decoration: underline;
		font-size: 1.8em;
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

function displayNodeInfos(node) {
    hmLog("[NODE INFO: " + node + "]");
    let nid = node.querySelector('title').textContent;
    let attrs = nodesAttributes[nid];
    document.getElementById('us-link-aspan').innerHTML = `<a href="./content/${collection}/${attrs.id}" target="_blank" style="cursor: pointer;">US ${nid}</a>`;
	var cType = attrs.context_type == null ? "-" : attrs.context_type;
	document.getElementById('us-link-cspan').innerHTML = `(<i>${cType}</i>)`;
	document.getElementById('us-desc-dspan').innerHTML = `${attrs.text}`;
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
  if (document.getElementById('us-link-aspan')) document.getElementById('us-link-aspan').innerHTML = "";
  if (document.getElementById('us-link-cspan')) document.getElementById('us-link-cspan').innerHTML = "";
  if (document.getElementById('us-desc-dspan')) document.getElementById('us-desc-dspan').innerHTML = "";
  instance().then(function(viz) {
    const item = document.querySelector("#div-graph");
    while (item.firstChild) {
      item.removeChild(item.firstChild)
    }
    let digraph = "digraph {splines=" + currentSplines + "; concentrated=" + currentConcentrated + "; " + currentGraph + " }";
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
        var nodeText = node.description;
        var nodeProps = ["shape=\"box\""];
		
		if(node.context_type && contextProps[node.context_type] != null) {
			hmLog("Adding " + contextProps[node.context_type] + " as node props");
			nodeProps = contextProps[node.context_type];
		}
        
		nodes.push("\"" + node["context_id"] + "\" [" + nodeProps.join(",") + "];");
        nodesAttributes[node["context_id"]] = {"id": node.id, "text": nodeText, "context_type": node.context_type}; //Could not figure out how to access images

        if (node["stratigraphy"]) {
            for (var cix in node["stratigraphy"]) {
                let child = node["stratigraphy"][cix];
                var relation = "";
				
				if (child["other_context"] == null) continue;
				let otherContextId = child["other_context"]["context_id"];
				if (validTargets[otherContextId] == null) continue;
				
				if (child["relationship"]) {
					if (['fills', 'covers', 'cuts'].indexOf(child["relationship"]) != -1) {
						relation = "\"" + node["context_id"] + "\" -> \"" + otherContextId + "\";";
					} else if (['is filled by', 'is covered by', 'is cut by'].indexOf(child["relationship"]) != -1) {
						relation = "\"" + otherContextId + "\" -> \"" + node["context_id"] + "\";";
					} else if (child["relationship"] == "carries") {
						relation = "\"" + otherContextId + "\" -> \"" + node["context_id"] + "\" [style=\"dashed\", color=\"green\", dir=\"none\"];";
					} else if (child["relationship"] == "is the same as") {
						relation = "\"" + otherContextId + "\" -> \"" + node["context_id"] + "\" [style=\"dashed\", color=\"blue\", dir=\"none\"];";
					} else if (child["relationship"] == "is bound to") {
						relation = "\"" + otherContextId + "\" -> \"" + node["context_id"] + "\" [style=\"dotted\", color=\"blue\", dir=\"none\"];";
					} else {
						hmLog("Not managed: " + child["relationship"]);
					}
				}
				
				if (arcs.indexOf(relation) == -1) arcs.push(relation);
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
		refresh: Function //VITAL!!!
	},
    watch: {
		items: {
		  deep: true,
		  immediate: true,
		  handler: function(newVal, oldVal) {
             currentItems = newVal;
			 filterOut(); //Filtering inline
             prepareGraph();
             displayGraph(); 
		  }
		},
        spline: function(newVal, oldVal) {
            currentSplines = newVal;
            displayGraph();
        },
        concentrated: function(newVal, oldVal) {
            currentConcentrated = newVal;
            displayGraph();
        },
        contextType: function(newVal, oldVal) {
			hmLog("Context type is now: " + newVal);
            currentContextType = newVal;
            filterOut(); //Filtering inline
            prepareGraph();
            displayGraph();
        },
        consoleLogging: function(newVal, oldVal) {
			console.log("Console log: " + (newVal == true ? "ON" : "OFF"));
            consoleLogging = newVal;
        },
		contextProps: function(newVal, oldVal) {
			hmLog("Redoing context props");
			contextProps = parseCProps(newVal);
			prepareGraph();
			displayGraph();
        },
		filter: function(newVal, oldVal) {
			//Refreshing after filter has changed
			setTimeout(function() { refreshHandler(); }, 500);
        },
    },
    setup(props, context) {
	    onMounted(() => {
			refreshHandler = props.refresh;
			collection = props.collection;
			console.log("Mounted: " + props.collection);
			contextProps = parseCProps(props.contextProps);
			console.log("Contexts Props: " + JSON.stringify(contextProps));
		});
    },
};

</script>
