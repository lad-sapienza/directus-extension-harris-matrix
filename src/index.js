import { ref, computed } from 'vue';
import { toRefs } from 'vue';
import { useItems, useCollection, useSync } from '@directus/extensions-sdk';
import LyoutOptions from './options.vue';
import LayoutComponent from './layout.vue';
import { LayoutOptions } from './types';

export default {
	id: 'directus-harris-matrix-layout',
	name: 'Harris Matrix',
	icon: 'schema', //icon value from here -> https://fonts.google.com/icons
	component: LayoutComponent,
	slots: {
		options: LyoutOptions,
		sidebar: () => null,
		actions: () => null,
	},
	setup(props, { emit }) {
		const name = ref('Harris Matrix');

		const selection = useSync(props, 'selection', emit);
        const layoutOptions = useSync(props, 'layoutOptions', emit);
		
        const { collection, filter, search } = toRefs(props);
        const { info, primaryKeyField, fields: fieldsInCollection } = useCollection(collection);
        const { 
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
            fields: ['context_id', 'description', 'context_type', 'stratigraphy.*.*'],
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
		
		
		const contextProps = `layer$shape=ellipse;tooltip=Layer

cut$shape=invtrapezium;style=filled;color=red;fillcolor=white;tooltip=Cut
		
structure$shape=box;style=filled;fillcolor=#ebebeb;tooltip=Structure`;
		
		
							 
		const spline = 'Ortho';
        const concentrated = false;
        const contextType = null;
		const consoleLogging = false;
		
		return { 
            name,
            info,
            primaryKeyField,
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
			contextTypes,
			consoleLogging,
			collection,
			contextProps
        };
		
		function refresh() { //UNUSED?
			getItems();
		}
		
	},
};