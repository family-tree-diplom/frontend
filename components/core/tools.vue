<script setup lang="ts">
defineProps({
    loading: {
        type: Boolean,
        default: () => false,
    },
});
const emit = defineEmits(['add', 'remove', 'save', 'deletePerson', 'addRelations', 'removeRelations', 'editPerson', "alignSiblings"]);
</script>

<template>
    <div class="tools" :class="{ tools_loading: loading }">
        <div v-if="loading" class="tools-loader"></div>
        <button class="tools-button" title="Додавання людини" @click="emit('add')" :disabled="loading">
            <atom-icons name="personPlus"></atom-icons>
        </button>
        <button class="tools-button" title="Видалення людини" @click="emit('deletePerson')" :disabled="loading">
            <atom-icons name="personDef"></atom-icons>
        </button>
        <button class="tools-button" title="Редагування людини" @click="emit('editPerson')" :disabled="loading">
            <atom-icons name="editPerson"></atom-icons>
        </button>
        <button class="tools-button" title="Збереження доданих людей" @click="emit('save')" :disabled="loading">
            <atom-icons name="save"></atom-icons>
        </button>
        <button class="tools-button" title="Додавання зв'язків" @click="emit('addRelations')" :disabled="loading">
            <atom-icons name="relations"></atom-icons>
        </button>
        <button class="tools-button" title="Видалення зв'язків" @click="emit('removeRelations')" :disabled="loading">
            <atom-icons name="removeRelations"></atom-icons>
        </button>
        <button class="tools-button" title="Вирівнювання зв'язків" @click="emit('alignSiblings')" :disabled="loading">
            <atom-icons name="align"></atom-icons>
        </button>
    </div>
</template>

<style lang="scss">
.tools {
    position: fixed;
    display: flex;
    background-color: #fff;
    right: 0;
    padding: 5px 15px;
    border-left: 1px solid grey;
    border-top: 1px solid grey;
    border-bottom: 1px solid grey;
    border-radius: 0 0 0 10px;
    z-index: 2;
    &_loading {
        opacity: 0.5;
    }
    &-button {
        display: flex;
        padding: 0 5px;
        &[disabled] {
            cursor: not-allowed;
            opacity: 0.4;
        }
    }
    &-loader {
        width: 18px;
        height: 18px;
        border: 3px solid rgba(0, 0, 0, 0.2);
        border-top-color: #000;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
