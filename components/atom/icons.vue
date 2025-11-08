<script lang="ts" setup>
defineProps({
    name: {
        type: String,
        required: true,
    },
    store: {
        type: String,
        default() {
            return 'icons';
        },
    },
});
</script>
<template>
    <svg class="icons" :class="'icons_' + name">
        <use v-bind="{ 'xlink:href': store + '.svg#' + name }"></use>
    </svg>
</template>

<style lang="scss">
.icons {
    display: inline-block;
    &_personPlus {
        width: 30px;
        height: 30px;
    }
    &_save {
        width: 30px;
        height: 30px;
    }
    &_personDef{
        width: 30px;
        height: 30px;
    }
    &_relations{
        width: 30px;
        height: 30px;
    }
    &_removeRelations{
        width: 30px;
        height: 30px;
    }
}
</style>
