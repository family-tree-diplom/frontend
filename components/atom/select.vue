<script setup lang="ts">

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    options: {
        type: Array as () => { value: string; label: string }[],
        default: () => [
            { value: 'unknown', label: 'Не визначено' },
            { value: 'male', label: 'Чоловік' },
            { value: 'female', label: 'Жінка' },
        ],
    },
    label: {
        type: String,
        default: 'Стать:',
    },
});

const emit = defineEmits(['update:modelValue']);
const localValue = ref(props.modelValue);

watch(localValue, (val) => emit('update:modelValue', val));
</script>

<template>
    <div class="gender-select">
        <label v-if="label" for="gender" class="gender-label">{{ label }}</label>
        <select id="gender" v-model="localValue" class="gender-dropdown">
            <option
                v-for="option in props.options"
                :key="option.value"
                :value="option.value"
            >
                {{ option.label }}
            </option>
        </select>
    </div>
</template>

<style scoped lang="scss">
.gender-select {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-top: 8px;
    color: #2d3748;
}

.gender-label {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
    color: #2d3748;
}

.gender-dropdown {
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
</style>
