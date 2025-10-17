import { ref, computed, watch } from "vue";
import { toRefs } from "vue";
import { useItems, useCollection, useSync } from "@directus/extensions-sdk";
import LyoutOptions from "./options.vue";
import LayoutComponent from "./layout.vue";
// LayoutOptions type removed from JS runtime import (was only a TypeScript type)

export default {
  id: "directus-harris-matrix-layout",
  name: "Harris Matrix",
  icon: "schema", //icon value from here -> https://fonts.google.com/icons
  component: LayoutComponent,
  slots: {
    options: LyoutOptions,
    sidebar: () => null,
    actions: () => null,
  },
  setup(props, { emit }) {
    const name = ref("Harris Matrix");

		const selection = useSync(props, 'selection', emit);
		
		const keyFields = computed(() => {
			var fields = [];
			for (var lfvi in fieldsInCollection.value) {
				let field = fieldsInCollection.value[lfvi];
				if (["string", "uuid", "text"].includes(field.type)) {
					fields.push({"text": `${field.name}`, "value": `${field.field}`});
				}
			}
			return fields;
		});
		
		const labellingFields = computed(() => {
			var fields = [];
			for (var lfvi in fieldsInCollection.value) {
				let field = fieldsInCollection.value[lfvi];
				if (["string", "uuid", "text"].includes(field.type)) {
					fields.push({"text": `${field.name}`, "value": `${field.field}`});
				}
			}
			return fields;
		});
		
		const contextTypeFields = computed(() => {
			var fields = [];
			for (var lfvi in fieldsInCollection.value) {
				let field = fieldsInCollection.value[lfvi];
				if (["string", "text"].includes(field.type)) { //String-like by now
					fields.push({"text": `${field.name}`, "value": `${field.field}`});
				}
			}
			return fields;
		});
		
		const descriptionFields = computed(() => {
			var fields = [];
			for (var lfvi in fieldsInCollection.value) {
				let field = fieldsInCollection.value[lfvi];
				if (["string", "uuid", "text"].includes(field.type)) {
					fields.push({"text": `${field.name}`, "value": `${field.field}`});
				}
			}
			return fields;
		});
		
		
		const { collection, filter, search } = toRefs(props);
		
		// QUERY FIELDS - DEFAULTED!
		var contextIdField = getSessionOptField("contextIdField", "context_id");
		var contextLabelField = getSessionOptField("contextLabelField", "context_id");
		var contentDescriptionField = getSessionOptField("contentDescriptionField", "description");
		var contextTypeField = getSessionOptField("contextTypeField", "context_type");

	const queryFields = computed(() => {
		var fields = [];
		for (var lfvi in fieldsInCollection.value) {
			let field = fieldsInCollection.value[lfvi].field;
			if (field == "stratigraphy") { continue }
			fields.push(field);
		}
		// For O2M relationships, fetch relationship data AND the related context's context_id
		fields.push('stratigraphy.id');
		fields.push('stratigraphy.relationship');
		fields.push('stratigraphy.this_context');
		fields.push('stratigraphy.other_context.context_id');
		return fields;
	});		const { info, primaryKeyField, fields: fieldsInCollection } = useCollection(collection);
        var { 
				items,
				loading,
				error,
				totalPages,
				itemCount,
				totalCount,
				changeManualSort,
				getItems,
				getItemCount,
				getTotalCount,			
		 } = useItems(collection, {
            sort: primaryKeyField.field,
            limit: '-1',
            fields: queryFields, //['context_id', 'description', 'context_type', 'stratigraphy.*.*'],
            filter,
            search,
        });
		
		
		const contextTypes = computed(() => {
			var itz = [{"text": "Any", "value": null}, {"text": "None", "value": "---no-context"}]
			var itzf = [];
			// TODO: Apply array mapping for a better readability
			for (var ic in items.value) {
				let item = items.value[ic];
				if (item.context_type) {
					if (itzf.indexOf(item.context_type) != -1) continue;
					let it = {"text": item.context_type, "value": item.context_type};
					itzf.push(item.context_type);
					itz.push(it);
				}
			}
			return itz;
		});

		
		const contextPropsDefault = `layer$shape=ellipse;tooltip=Layer

cut$shape=invtrapezium;style=filled;color=red;fillcolor=white;tooltip=Cut
		
structure$shape=box;style=filled;fillcolor=#ebebeb;tooltip=Structure

--ce-cluster$shape=box;style=filled,rounded;fillcolor=#ebebeb;tooltip=Cluster
`;
		
		const contextProps = getSessionOptField("contextProps", contextPropsDefault);
		
							 
		const spline = getSessionOptField("spline", 'Ortho');
    const concentrated = getSessionOptField("concentrated", false) == "true";
    const contextType = getSessionOptField("contextType", null);
		const consoleLogging = getSessionOptField("consoleLogging", false) == "true";
		const primaryKeyFieldKey = primaryKeyField.value.field;

		const graphEngine = getSessionOptField("graphEngine", "standard");
		
		return { 
            name,
            info,
            primaryKeyField,
						primaryKeyFieldKey,
            items,
            loading,
            filter,
            search,
            fieldsInCollection,
            error,
            spline,
            concentrated,
            contextType,
						selection,
						getItems,
						refresh,
						optFieldsChanged,
						contextTypes,
						consoleLogging,
						collection,
						contextProps,
						keyFields,
						labellingFields,
						contextTypeFields,
						descriptionFields,
						contextIdField, 
						contextLabelField, 
						contentDescriptionField, 
						contextTypeField,
						graphEngine
        };
		
		function refresh() {
			getItems();
		}
		
		function getSessionOptField(field, defaultValue) {
			let sv = sessionStorage.getItem(`${collection}_${field}_store`);
			if (sv) return sv;
			return defaultValue;
		}
		
	function optFieldsChanged(field, value, refreshItems) {
		sessionStorage.setItem(`${collection}_${field}_store`, value);
		if (refreshItems == true) refresh();
	}
},
};