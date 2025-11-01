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
            <atom-input placeholder="Прізвище" v-model="modelValue.surname" class="styled-input" />
            <atom-input placeholder="Ім'я" v-model="modelValue.name" class="styled-input" />
        </div>

        <small>
            <atom-input
                placeholder="Дата народження"
                v-model="modelValue.birth_day"
                class="styled-input small-input"
            />
        </small>

        <small>
            <atom-input
                placeholder="Дата смерті"
                v-model="modelValue.death"
                class="styled-input small-input"
            />
        </small>

        <small>
            <atom-select
                v-model="modelValue.gender"
                :options="[
            { value: 'unknown', label: 'Не визначено' },
            { value: 'male', label: 'Чоловік' },
            { value: 'female', label: 'Жінка' }
        ]"
                class="styled-select small-input"
            />
        </small>
    </div>
</template>

<style lang="scss" scoped>
.draggable-box {
    width: 250px;
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
    padding-bottom: 10px;
    box-sizing: border-box;
}

.drag-handle {
    width: 100%;
    padding: 10px 0;
    background-color: #2d3748;
    color: white;
    font-weight: bold;
    cursor: grab;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
}

.styled-input,
.styled-select {
    width: 90%;
    padding: 6px 8px;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    background-color: #f7fafc;
    color: #2d3748;
    font-size: 14px;
    box-sizing: border-box;
    transition:
        border-color 0.2s,
        background-color 0.2s;

    &:focus {
        outline: none;
        border-color: #2d3748;
        background-color: #edf2f7;
    }
}

.small-input {
    font-size: 13px;
    width: 90%;
}

.draggable-box small {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 8px;
    color: #718096;
    box-sizing: border-box;
}
</style>
