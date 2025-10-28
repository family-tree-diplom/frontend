<script setup lang="ts">
const props = defineProps({
    modelValue: {
        type: Object,
        default() {
            return null;
        },
    },
    position: { type: Object, required: true, default: () => ({ x: 0, y: 0 }) },
});
</script>

<template>
    <div
        v-if="position"
        class="draggable-box"
        :style="{ transform: `translate(${position?.x ?? 0}px, ${position?.y ?? 0}px)` }"
    >
        <div class="drag-handle">
            <atom-input placeholder="Прізвище" :model-value="modelValue.surname"></atom-input>
            <atom-input placeholder="Ім'я" :model-value="modelValue.name"></atom-input>
        </div>
        <small><atom-input placeholder="Ім'я" :model-value="modelValue.name"></atom-input></small>

    </div>
</template>

<style lang="scss">
.draggable-box {
    width: 200px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform-origin: top left;
    z-index: 10;
}
.drag-handle {
    width: 100%;
    padding: 10px;
    background-color: #2d3748;
    color: white;
    font-weight: bold;
    cursor: grab;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}
.draggable-box small {
    margin-top: 8px;
    color: #718096;
}
</style>
