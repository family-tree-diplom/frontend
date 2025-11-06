<script setup lang="ts">
const props = defineProps({
    person: { type: Object, required: true },
    position: { type: Object, required: true, default: () => ({ x: 0, y: 0 }) },
    makeDraggable: { type: Function, required: true },
    boxRefs: { type: Object, required: true },
    selected: { type: Boolean, default: () => false },
});

onMounted(() => {
    const el = props.boxRefs[props.person.id];
    if (el) props.makeDraggable(el);
});
onBeforeUnmount(() => {
    const el = props.boxRefs[props.person.id];
    if (el) {
        el.onmousedown = el.onmouseup = el.onmousemove = null;
    }
});
</script>

<template>
    <div
        v-if="position"
        :ref="(el) => (boxRefs[person.id] = el)"
        class="draggable-box card"
        :class="{ card_selected: selected }"
        :data-id="person.id"
        :style="{ transform: `translate(${position?.x ?? 0}px, ${position?.y ?? 0}px)` }"
    >
        <div
            class="drag-handle"
            :class="{
                male: person.gender === 'man',
                female: person.gender === 'woman',
                unknown: !person.gender || person.gender === 'unknown',
            }"
        >
            {{ person.surname + ' ' + person.name }}
        </div>
        <small>
            {{ person?.birth_day || '' }}{{ person?.death ? ' - ' + person.death : '' }}
        </small>
        <small>{{ person.id }}</small>
    </div>
</template>

<style lang="scss">
.card {
    &_selected {
        outline: 2px solid #3182ce;
        box-shadow: 0 0 8px rgba(49, 130, 206, 0.8);
    }
}
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

.drag-handle.male {
    background-color: #2a5bba;
}

.drag-handle.female {
    background-color: #d86ba4;
}

.drag-handle.unknown {
    background-color: #2d3748;
}

.draggable-box small {
    margin-top: 8px;
    color: #718096;
}
</style>
