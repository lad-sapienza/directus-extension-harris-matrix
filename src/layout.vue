<template>
	<div class="layout-harris-matrix">
		<div v-if="!loading">
	        <div id="div-graph"></div>
	    </div>
		<!--
	    <div id="info"></div>
		-->
	</div>
</template>

<style lang="css" scoped>

	.layout-harris-matrix {
		display: contents;
		margin: var(--content-padding);
		margin-bottom: var(--content-padding-bottom);
	}

    #div-graph { 
		/*border: solid 1pt black; 
		border-radius: 15px; 
		margin-left: 10%; 
		margin-top: 5%;*/
		
		min-width: calc(100% - var(--content-padding)) !important;
		min-height: calc(100% - var(--content-padding-bottom)) !important;
		margin-left: var(--content-padding);
	}
	
	
	#div-graph svg { width: 98% !important; height: 98% !important; }
    #category-sel { margin-left: 10%; margin-top: 20px; }
    #info { margin-left: 10%; margin-top: 20px; }
    #info a { margin-left: 10%; text-decoration: underline; }
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

var currentItems = [];
var graphItems = [];
var validTargets = [];
var currentGraph = null;
var currentSplines = 'ortho';
var currentConcentrated = false;
var currentContextType = null;
var nodesAttributes = {};
var consoleLogging = false;

function displayNodeInfos(node) {
    hmLog("[NODE INFO: " + node + "]");
    let nid = node.querySelector('title').textContent;
    let attrs = nodesAttributes[nid];
    let tgt = "https://archeodirect.info/admin/content/contexts/" + attrs.id + "\"";
    document.getElementById('info').innerHTML = "<a href=\"" + tgt + "\" target=\"_blank\" style=\"font-weight: bolder; cursor: pointer;\">US " + nid + "</a>: " + attrs.text;
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
      el.addEventListener('mouseover', function() {
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
                if (contextType != currentContextType) {
                    hmLog("Discarding " + node["context_id"] + " (filtered out)");
                    continue;
                } else {
                    hmLog("Enrolling " + node["context_id"]);
                    graphItems.push(node);
                }
            } else {
                hmLog("Enrolling " + node["context_id"] + " (no category)");
                graphItems.push(node);
            }
        }
    } else {
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
        
		//Props here
		
		
        nodes.push("\"" + node["context_id"] + "\" [" + nodeProps.join(",") + "];");
        nodesAttributes[node["context_id"]] = {"id": node.id, "text": nodeText};

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
					} else {
						hmLog("Correlation: to be done");
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
		refresh: Function //UNUSED, BY NOW
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
		filter: function(newVal, oldVal) {
			//NOOP
        },
    },
    setup(props, context) {
	    onMounted(() => {
			//NOOP
		});
    },
};


/*
{context_id: 'BA-100', description: 'A layer of brown clayey soil matrix with concentra…ered by US 3; US101; covers US 102; US 103; US104', id: 1, stratigraphy: Array(5)}

stratigraphy 0 -> {id: 1, relationship: 'is covered by', other_context: {…}, this_context: {…}}

other context -> ['id', 'user_created', 'date_created', 'user_updated', 'date_updated', 'context_id', 'location_definition', 'description', 'site', 'complex', 'trench', 'context_type', 'material_culture', 'images', 'stratigraphy', 'finds', 'list_of_inventoried_finds']
*/

</script>
