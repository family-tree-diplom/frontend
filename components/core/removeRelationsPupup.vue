<script setup lang="ts">
const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'accept']);

const close = () => emit('update:modelValue', false);
const accept = () => emit('accept');
</script>

<template>
    <atom-popup v-model="props.modelValue">
        <div class="relation-box">
            <p>Ви впевнені, що хочете видалити зв’язки між обраними людьми?</p>
            <div class="btn-group">
                <button class="btn accept" :disabled="disabled" @click="accept">Прийняти</button>
                <button class="btn reject" @click="close">Відхилити</button>
            </div>
        </div>
    </atom-popup>
</template>

<style lang="scss">
.relation {
    &-box {
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 16px 20px;
        font-family: 'Segoe UI', sans-serif;
        color: #333;
        max-width: 520px;
        line-height: 1.5;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }
    &-group {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 14px;
    }
}
</style>
