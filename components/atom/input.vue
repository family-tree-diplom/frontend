<script lang="ts" setup>
const props = defineProps({
    modelValue: {
        type: [String, Number, Object],
        default() {
            return null;
        },
    },
    type: {
        type: String,
        default() {
            return 'text';
        },
    },
    label: {
        type: String,
        default() {
            return null;
        },
    },
    inputmode: {
        type: String,
        default() {
            return null;
        },
    },
    placeholder: {
        type: String,
        default() {
            return '';
        },
    },
});

const emit = defineEmits(['update:modelValue']);
const inputValue = computed({
    get() {
        return props.modelValue;
    },
    set(value) {
        emit('update:modelValue', value);

    },
});
</script>
<template>
    <div class="input">
        <input
            v-model="inputValue"
            :type="type"
            :inputmode="inputmode"
            :placeholder="placeholder"
            class="input-input"
        />
    </div>
</template>
<style lang="scss">
.input {
    &-input {

    }
}
</style>
