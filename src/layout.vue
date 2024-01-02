<template>
    <div v-if="!loading">
        <div id="test-div-graph" style="width: 500px; height: 500px;"></div>
    </div>
    <select id="category-sel"></select>
    <div id="info"></div>
</template>

<style lang="css">
    #test-div-graph svg { width: 98% !important; height: 98% !important; }
</style>

<style lang="css" scoped>
    #test-div-graph { border: solid 1pt black; border-radius: 15px; margin-left: 10%; margin-top: 5%; }
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
var localRefreshVariabella = 'pippo';
var currentConcentrated = false;
var currentCategory = null;
var nodesAttributes = {};
console.log(localRefreshVariabella);

function displayNodeInfos(node) {
    console.log(node);
    let nid = node.querySelector('title').textContent;
    let attrs = nodesAttributes[nid];
    let tgt = "https://archeodirect.info/admin/content/contexts/" + attrs.id + "\"";
    document.getElementById('info').innerHTML = "<a href=\"" + tgt + "\" target=\"_blank\" style=\"font-weight: bolder; cursor: pointer;\">US " + nid + "</a>: " + attrs.text;
}

function addZoomPan() {
    let svg = document.querySelector("#test-div-graph").querySelector('svg');
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
    const item = document.querySelector("#test-div-graph");
    while (item.firstChild) {
      item.removeChild(item.firstChild)
    }
    let digraph = "digraph {splines=" + currentSplines + "; concentrated=" + currentConcentrated + "; " + currentGraph + " }";
    console.log("DIGRAPH V2: " + digraph);
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
    if (currentCategory) {
        graphItems = [];
        for (var eidx in currentItems) {
            let node = currentItems[eidx];
            let nodeCategory = node.us_category;
            if (nodeCategory) {
                if (nodeCategory.id != currentCategory) {
                    console.log("Discarding " + node.us_name + " (filtered out)");
                    continue;
                } else {
                    console.log("Enrolling " + node.us_name);
                    graphItems.push(node);
                }
            } else {
                console.log("Discarding " + node.us_name + " (no category)");
                continue;
            }
        }
    } else {
        graphItems = currentItems;
    }
}

// No inline category management in V2
/*
function prepareCategories() {
    const c_select = document.querySelector("#category-sel");
    while (c_select.firstChild) {
      c_select.removeChild(c_select.firstChild)
    }
    var nullopt = document.createElement("option");
    nullopt.text = "[NO CATEGORY]";
    c_select.appendChild(nullopt);
    var cat_presence = {};
    for (var eidx in currentItems) {
        let node = currentItems[eidx];
        let nodeCategory = node.us_category;
        if (nodeCategory) {
            if (nodeCategory.id in cat_presence) { continue };
            cat_presence[nodeCategory.id] = true;
            var option = document.createElement("option");
            option.text = nodeCategory.category_name;
            option.value = "" + nodeCategory.id;
            c_select.appendChild(option);
        }
    }
    c_select.addEventListener("change", function() {
      updateCategory();
    });
}
*/

function updateCategory() {
    let newVal = document.querySelector("#category-sel").value;
    currentCategory = parseInt(newVal);
    filterOut(); //Filtering inline
    prepareGraph();
    displayGraph();
}

// Old version: kept here just to take some quick example
/*
function prepareGraph() {
    let items = graphItems;
    setValidTargtes();
    
    nodesAttributes = {};
    console.log('Vertex count: ' + items.length);

    var nodes = [];
    var arcs = [];

    for (var eidx in items) {
        let node = items[eidx];
        var nodeText = "";
        var nodeProps = ["shape=\"box\""];
        let nodeCategory = node.us_category;
        if (nodeCategory) {
            nodeProps = ["shape=\"" + nodeCategory.shape + "\""];
            if ("fill_color" in nodeCategory) { nodeProps.push("fillcolor=\"" + nodeCategory.fill_color + "\""); }
            if ("style" in nodeCategory) { nodeProps.push("style=\"" + nodeCategory.style + "\""); }
            if ("category_name" in nodeCategory) { 
                nodeProps.push("tooltip=\"" + nodeCategory.category_name + "\""); 
                nodeText = nodeCategory.category_name;
            }
        } else {
            console.log("Discarding " + node.us_name + " (no category)");
            continue;
        }

        nodes.push(node.us_name + " [" + nodeProps.join(",") + "];");
        nodesAttributes[node.us_name] = {"id": node.id, "text": nodeText};

        if (node.children) {
            for (var cix in node.children) {
                let child = node.children[cix];
                //Dangerous
                for (var ch_key in child) {
                    if (ch_key.startsWith('related_')) {
                        let chUsName = child[ch_key]["us_name"];
                        if (chUsName in validTargets) {
                            arcs.push(node.us_name + " -> " + chUsName + ";");
                        }
                        break;
                    }
                }
            }
        }
    }

    currentGraph = nodes.join("\n") + "\n" + arcs.join("\n");
    console.log(currentGraph);
}
*/

function prepareGraph() {
    let items = graphItems;
    setValidTargtes();
    
    nodesAttributes = {};
    console.log('Vertex count: ' + items.length);

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
						console.log("Correlation: to be done");
					}
				}
				
				if (arcs.indexOf(relation) == -1) arcs.push(relation);
            }
        }
    }

    currentGraph = nodes.join("\n") + "\n" + arcs.join("\n");
    console.log(currentGraph);
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
        category: {
            type: String,
			default: null,
        },
		filter: {
            type: String,
            default: null,
        },
		refresh: Function
	},
    watch: {
		items: {
		  deep: true,
		  immediate: true,
		  handler: function(newVal, oldVal) {
             currentItems = newVal;
			 //prepareCategories();
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
        category: function(newVal, oldVal) {
            currentCategory = parseInt(newVal);
            filterOut(); //Filtering inline
            prepareGraph();
            displayGraph();
        },
		filter: function(newVal, oldVal) {
			setTimeout(function() { localRefreshVariabella(); }, 500);
        },
    },
    setup(props, context) {
	    onMounted(() => {
			localRefreshVariabella = props.refresh;
		});
    },
};


/*
{context_id: 'BA-100', description: 'A layer of brown clayey soil matrix with concentra…ered by US 3; US101; covers US 102; US 103; US104', id: 1, stratigraphy: Array(5)}

stratigraphy 0 -> {id: 1, relationship: 'is covered by', other_context: {…}, this_context: {…}}

other context -> ['id', 'user_created', 'date_created', 'user_updated', 'date_updated', 'context_id', 'location_definition', 'description', 'site', 'complex', 'trench', 'context_type', 'material_culture', 'images', 'stratigraphy', 'finds', 'list_of_inventoried_finds']
*/

</script>
