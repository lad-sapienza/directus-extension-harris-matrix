import { ref } from 'vue';
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
            fields: ['context_id', 'description', 'stratigraphy.*.*'], //['us_id', 'us_name', 'us_category.*.*', 'children.*.*'],
            filter,
            search,
        });
		
		
		const spline = 'Ortho';
        const concentrated = false;
        const category = null;
		
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
            category,
			selection,
			getItems,
			refresh
        };
		
		function refresh() {
			getItems();
		}
		
	},
};


//check app/src/layouts/tabular/


