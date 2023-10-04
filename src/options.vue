<script lang="ts">
export default {
	inheritAttrs: false,
    setup(props) {
        console.log("SPRINEZ: " + props.spline);
    }
};
</script>

<script setup lang="ts">
import { useSync } from '@directus/composables';
import { Field } from '@directus/types';

interface Props {
	fields: string[];
	activeFields: Field[];
	spline: 'none' | 'line' | 'polyline' | 'curved' | 'ortho' | 'spline';
    concentrated: true | false;
    category: string;
}

const props = defineProps<Props>();

const emit = defineEmits(['update:spline', 'update:activeFields', 'update:fields', 'update:concentrated', 'update:category']);

const splineWritable = useSync(props, 'spline', emit);
const concentratedWritable = useSync(props, 'concentrated', emit);
const categoriesWritable = useSync(props, 'category', emit);
</script>

<template>
	<div class="field">
		<div class="type-label">Spline</div>
		<v-select
			v-model="splineWritable"
			:items="[
				{
					text: 'None',
					value: 'none',
				},
                {
					text: 'Line',
					value: 'line',
				},
                {
					text: 'Polyline',
					value: 'polyline',
				},
                {
					text: 'Curved',
					value: 'curved',
				},
                {
					text: 'Ortho',
					value: 'compact',
				},
                {
					text: 'Spline',
					value: 'spline',
				},
			]"
		/>
	</div>
    <div class="field">
		<div class="type-label">Concentrated</div>
		<v-checkbox v-model="concentratedWritable" label="Concentred graph mode" class="block"></v-checkbox>
	</div>
    <div class="field" id="hm-categories">
		<div class="type-label">Categories</div>
		<v-select
			v-model="categoriesWritable"
			:items="[
				{
					text: '',
					value: null,
				},
                {
					text: 'Cat 1',
					value: '1',
				},
                {
					text: 'Cat 2',
					value: '2',
				},
                {
					text: 'Cat 3',
					value: '3',
				},
                {
					text: 'Cat 4',
					value: '4',
				},
                {
					text: 'Cat 5',
					value: '5',
				},
                {
					text: 'Cat 6',
					value: '6',
				},
			]"
		/>
	</div>
</template>

<style lang="scss" scoped>
.v-checkbox {
	width: 100%;

	.spacer {
		flex-grow: 1;
	}
}

.drag-handle {
	--v-icon-color: var(--foreground-subdued);

	cursor: ns-resize;

	&:hover {
		--v-icon-color: var(--foreground-normal);
	}
}
</style>