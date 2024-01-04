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
			var itz = [{"text": "Any", "value": null}]
			var itzf = [];
			console.log("Itimzz");
			for (var ic in items.value) {
				let item = items.value[ic];
				if (item.context_type) {
					if (itzf.indexOf(item.context_type) != -1) continue;
					let it = {"text": item.context_type, "value": item.context_type};
					console.log(it);
					itzf.push(item.context_type);
					itz.push(it);
				}
			}
			return itz;
		});
		
//			:item-title="title"
//			:item-value="value"

		const spline = 'Ortho';
        const concentrated = false;
        const contextType = null;
		
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
			contextTypes
        };
		
		function refresh() {
			getItems();
		}
		
	},
};


//check app/src/layouts/tabular/


