<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';
import { useFamilyLines } from '~/composables/useFamilyLines';
import { useCamera } from '~/composables/useCamera';

const { peoples, relations } = useFamilyData();

const boxRefs = ref([]); // посилання на div-блоки
const lineRefs = ref([]); // посилання на svg-лінії
const circleRefs = ref<Record<string, SVGCircleElement>>({});

interface Position {
    x: number;
    y: number;
}
const positions = reactive<Record<number, Position>>({});

const STORAGE_KEY = 'family_positions';

const { camera, cameraStyle, onWheel, onMouseDown, onMouseMove, onMouseUp } = useCamera();
const { updateAllLines, marriageCenters, makePairKey } = useFamilyLines(
    boxRefs,
    lineRefs,
    circleRefs,
    relations,
    positions
);

function savePositions() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(positions)));
}

function loadPositions() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<number, Position>;
    } catch {
        return {};
    }
}

const { makeDraggable } = useDraggable(updateAllLines, camera, positions);

function initDragAndLines() {
    if (!process.client) return;

    nextTick(() => {
        boxRefs.value = [];
        lineRefs.value = [];
        circleRefs.value = {};

        const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');
        draggableElements.forEach((el) => makeDraggable(el));

        nextTick(updateAllLines);
    });
}

function cleanupDrag() {
    const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');
    draggableElements.forEach((el) => {
        el.onmousedown = null;
        el.onmouseup = null;
        el.onmousemove = null;
    });
}

const gridStyle = computed(() => {
    const size = 20 * camera.scale;
    return {
        backgroundImage: `
      linear-gradient(to right, #e2e8f0 1px, transparent 1px),
      linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
    `,
        backgroundSize: `${size}px ${size}px`,
        backgroundColor: '#fff',
    };
});
watch(
    peoples,
    (newPeoples) => {
        if (!newPeoples || newPeoples.length === 0) return;

        const saved = loadPositions();

        newPeoples.forEach((p, index) => {
            if (!positions[p.id]) {
                if (saved[p.id]) {
                    positions[p.id] = { x: saved[p.id].x, y: saved[p.id].y };
                } else {
                    positions[p.id] = { x: 150 + index * 100, y: 100 + index * 80 };
                }
            }
        });

        nextTick(initDragAndLines);
    },
    { immediate: true }
);

onMounted(() => {
    if (process.client) window.addEventListener('beforeunload', savePositions);
});
onBeforeUnmount(() => {
    if (process.client) window.removeEventListener('beforeunload', savePositions);
    cleanupDrag();
});

// Hot Reload підтримка
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        nextTick(() => {
            cleanupDrag();
            initDragAndLines();
        });
    });
}
</script>

<template>
    <div class="main-container viewport">
        <div class="canvas-wrapper" :style="[cameraStyle, gridStyle]">
            <svg v-if="peoples?.length > 1" class="line-canvas" :style="{ width: '50000px', height: '50000px' }">
                <line
                    v-for="(relation, index) in relations"
                    :key="`${relation.from}-${relation.to}`"
                    :ref="(el) => (lineRefs[index] = el)"
                    class="connector-line"
                    :data-relation-key="`${relation.from}-${relation.to}`"
                />
                <circle
                    v-for="(relation, index) in relations.filter((r) => r.type === 'marriage')"
                    :key="index"
                    :ref="(el) => (circleRefs[makePairKey(relation.from, relation.to)] = el)"
                    r="6"
                    class="connector-circle"
                />
            </svg>

            <base-card
                v-for="person in peoples"
                :key="person.id"
                :person="person"
                :position="positions[person.id]"
                :makeDraggable="makeDraggable"
                :boxRefs="boxRefs"
            />
        </div>
    </div>
</template>

<style>
.main-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}
.canvas-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 50000px;
    height: 50000px;
    transform-origin: 0 0;
    z-index: 0;
}
.line-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}
.connector-line {
    stroke: #a0aec0;
    stroke-width: 2px;
}
.connector-circle {
    stroke: #a0aec0;
    fill: #a0aec0;
    stroke-width: 2px;
}
</style>
