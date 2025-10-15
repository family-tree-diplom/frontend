<script setup lang="ts">
const props = defineProps({
    peoples: {
        type: Array,
        required: true,
    },
    relations: {
        type: Object,
        required: true,
    },
});

// Знаходимо початковий вузол за його ID
const fromPeoples = computed(() => {
    if (!props.relations.from) return null;
    return props.peoples.find((n) => n.id === props.relations.from);
});

// Знаходимо кінцевий вузол за його ID
const toPeoples = computed(() => {
    if (!props.relations.to) return null;
    return props.peoples.find((n) => n.id === props.relations.to);
});
</script>

<template>
    <!-- Вся логіка v-if/v-else-if для різних типів ліній тепер тут -->

    <!-- Зв'язок від шлюбу до однієї дитини -->
    <line
        v-if="relations.direction === 'marriageToChild'"
        :x1="fromPeoples?.x"
        :y1="fromPeoples?.y"
        :x2="toPeoples?.x"
        :y2="toPeoples?.y"
        stroke="#bbb"
        stroke-width="3"
        opacity="0.6"
    />
    <!-- Зв'язок від одного з батьків до однієї дитини -->
    <line
        v-else-if="relations.direction === 'personToChild'"
        :x1="fromPeoples?.x"
        :y1="fromPeoples?.y"
        :x2="toPeoples?.x"
        :y2="toPeoples?.y"
        stroke="#bbb"
        stroke-width="3"
        opacity="0.6"
    />
    <!-- Вертикальна лінія від батьків до платформи -->
    <line
        v-else-if="relations.direction === 'marriageToPlatform'"
        :x1="relations.x"
        :y1="relations.y1"
        :x2="relations.x"
        :y2="relations.y2"
        stroke="#bbb"
        stroke-width="3"
        opacity="0.6"
    />
    <!-- Горизонтальна платформа для кількох дітей -->
    <line
        v-else-if="relations.direction === 'platform' && Math.abs(relations.x2 - relations.x1) > 10"
        :x1="relations.x1"
        :y1="relations.y"
        :x2="relations.x2"
        :y2="relations.y"
        stroke="#333"
        stroke-width="3"
        opacity="0.9"
    />
    <!-- Вертикальна лінія від платформи до дитини -->
    <line
        v-else-if="relations.direction === 'platformToChild'"
        :x1="relations.x"
        :y1="relations.y1"
        :x2="relations.x"
        :y2="relations.y2"
        stroke="#444"
        stroke-width="3"
        opacity="0.7"
    />
    <!-- Стандартний зв'язок (наприклад, від особи до вузла шлюбу) -->
    <line
        v-else
        :x1="fromPeoples?.x"
        :y1="fromPeoples?.y"
        :x2="toPeoples?.x"
        :y2="toPeoples?.y"
        stroke="#ccc"
        stroke-width="3"
        opacity="0.7"
    />
</template>

<style scoped lang="scss"></style>
