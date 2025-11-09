<script setup lang="ts">
import { process } from 'std-env';

const config = useRuntimeConfig();

const props = defineProps({
    modelValue: {
        type: Object,
        default() {
            return null;
        },
    },
    position: { type: Object, required: true, default: () => ({ x: 0, y: 0 }) },
});

const save = async ()=>{
    const response = await $fetch('api/peoples', {
        baseURL: process.server ? config.public.API_BASE_URL : '',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            jsonrpc: '2.0',
            method: 'edit',
            params: {
                people: props.modelValue
            },
        },
    });
}
</script>

<template>
    <div
        v-if="position"
        class="draggable-box"
        :style="{ transform: `translate(${position?.x ?? 0}px, ${position?.y ?? 0}px)` }"
    >
        <div
            class="drag-handle"
            :class="{
                male: modelValue.gender === 'man',
                female: modelValue.gender === 'woman',
                unknown: !modelValue.gender || modelValue.gender === 'unknown',
            }"
        >
            <atom-input placeholder="Прізвище" v-model="modelValue.surname" class="styled-input" />
            <atom-input placeholder="Ім'я" v-model="modelValue.name" class="styled-input" />
        </div>

        <small>
            <atom-input placeholder="Дата народження" v-model="modelValue.birth_day" class="styled-input small-input" />
        </small>

        <small>
            <atom-input placeholder="Дата смерті" v-model="modelValue.death" class="styled-input small-input" />
        </small>

        <small>
            <atom-select
                v-model="modelValue.gender"
                :options="[
                    { value: 'unknown', label: 'Не визначено' },
                    { value: 'man', label: 'Чоловік' },
                    { value: 'woman', label: 'Жінка' },
                ]"
                class="styled-select small-input"
            />
        </small>
        <button class="btn accept" @click='save'>Зберегти</button>
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

.drag-handle.male {
    background-color: #2a5bba;
}

.drag-handle.female {
    background-color: #d86ba4;
}

.drag-handle.unknown {
    background-color: #2d3748;
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

.btn {
    margin-top: 8px ;
    padding: 6px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9em;
    transition: background 0.2s ease;
}

.btn.accept {
    background: #2b8a3e;
    color: #fff;
}
</style>
