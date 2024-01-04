<script setup lang="ts">
import { useSync } from '@directus/composables';
import { Field } from '@directus/types';

interface Props {
	fields: string[];
	activeFields: Field[];
	spline: 'none' | 'line' | 'polyline' | 'curved' | 'ortho' | 'spline';
    concentrated: true | false;
    contextType: string;
	contextTypes: Array;
	consoleLogging: true | false;
}

const props = defineProps<Props>();

const emit = defineEmits(['update:spline', 'update:activeFields', 'update:fields', 'update:concentrated', 'update:contextType', 'update:consoleLogging']);

const splineWritable = useSync(props, 'spline', emit);
const concentratedWritable = useSync(props, 'concentrated', emit);
const contextTypeWritable = useSync(props, 'contextType', emit);
const consoleLoggingWritable = useSync(props, 'consoleLogging', emit);
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
    <div class="field" id="hm-ctype">
		<div class="type-label">Context Types</div>
		<v-select
			v-model="contextTypeWritable"
			:items="contextTypes"
		/>
	</div>
    <div class="field">
		<div class="type-label">Console logging</div>
		<v-checkbox v-model="consoleLoggingWritable" label="Console logging" class="block"></v-checkbox>
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