<script setup lang="ts">
const props = defineProps({
    peoples: {
        type: Array,
        required: true,
    },
    relations: {
        type: Array,
        default() {
            return [{
                direction: '',
                from: '',
                to: '',
                x: '',
                x1: '',
                x2: '',
                y: '',
                y1: '',
                y2: '',
            }];
        },
    },
});
</script>

<template v-for="(link, idx) in relations" :key="'link-' + idx">
    <!-- Всі варіанти зв'язків, платформа, шлюб, батьки, діти -->
    <line
        v-if="link?.direction === 'marriageToChild'"
        :x1="peoples.find((n) => n.id === link?.from)?.x"
        :y1="peoples.find((n) => n.id === link?.from)?.y"
        :x2="peoples.find((n) => n.id === link?.to)?.x"
        :y2="peoples.find((n) => n.id === link?.to)?.y"
        stroke="#bbb"
        stroke-width="3"
        opacity="0.6"
    />
    <line
        v-else-if="link?.direction === 'personToChild'"
        :x1="peoples.find((n) => n.id === link?.from)?.x"
        :y1="peoples.find((n) => n.id === link?.from)?.y"
        :x2="peoples.find((n) => n.id === link?.to)?.x"
        :y2="peoples.find((n) => n.id === link?.to)?.y"
        stroke="#bbb"
        stroke-width="3"
        opacity="0.6"
    />
    <line
        v-else-if="link?.direction === 'marriageToPlatform'"
        :x1="link?.x"
        :y1="link?.y1"
        :x2="link?.x"
        :y2="link?.y2"
        stroke="#bbb"
        stroke-width="3"
        opacity="0.6"
    />
    <line
        v-else-if="link?.direction === 'platform' && Math.abs(link?.x2 - link?.x1) > 10"
        :x1="link?.x1"
        :y1="link?.y"
        :x2="link?.x2"
        :y2="link?.y"
        stroke="#333"
        stroke-width="3"
        opacity="0.9"
    />
    <line
        v-else-if="link?.direction === 'platformToChild'"
        :x1="link?.x"
        :y1="link?.y1"
        :x2="link?.x"
        :y2="link?.y2"
        stroke="#444"
        stroke-width="3"
        opacity="0.7"
    />
    <line
        v-else
        :x1="peoples.find((n) => n.id === link?.from)?.x"
        :y1="peoples.find((n) => n.id === link?.from)?.y"
        :x2="peoples.find((n) => n.id === link?.to)?.x"
        :y2="peoples.find((n) => n.id === link?.to)?.y"
        stroke="#ccc"
        stroke-width="3"
        opacity="0.7"
    />
</template>

<style scoped lang="scss"></style>
