<script setup lang="ts">
    const props = defineProps({
        modelValue: {
            type: Boolean,
            default: false,
        },

    })
    defineEmits(["update:modelValue"])

</script>

<template>
    <div class="popup" :class="{popup_active: modelValue}">
        <div class="popup-container">
            <div class="popup-wrapper">
                <slot></slot>
            </div>
        </div>
        <div class="popup-fiber" @click="$emit('update:modelValue', false)"></div>
    </div>
</template>

<style lang="scss">
.popup{
    position: relative;
    width: 100%;
    height: 100vh;
    display: none;
    z-index: 99999;
    &_active{
        display: block;
    }
    &-container{
        z-index: 1;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    &-fiber{
        position: fixed;
        top: 0;
        left: 0;
        background-color: #000000;
        opacity: 0.7;
        cursor: pointer;
        width: 100%;
        height: 100%;
        z-index: 0;
    }
}
</style>
