<script setup lang="ts">
    const emit = defineEmits(["add", "remove", "save"]);
</script>

<template>
    <div class="tools">
        <button class="tools-button" @click="emit('add')">
            <atom-icons name="personPlus"></atom-icons>
        </button>
        <button class="tools-button" @click="emit('save')">
            <atom-icons name="save"></atom-icons>
        </button>
    </div>
</template>

<style lang="scss">
    .tools {
        position: fixed;
        display: flex;
        flex-direction: column;
        right: 0;
        z-index: 2;
    }
</style>
