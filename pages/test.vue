<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';
import { useFamilyLines } from '~/composables/useFamilyLines';
import { useCamera } from '~/composables/useCamera';

/* ============================================================
   0️⃣ ДАНІ ТА РЕАКТИВНІ СТАНИ
   ============================================================ */
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

/* ============================================================
   1️⃣ ЗБЕРЕЖЕННЯ ТА ВІДНОВЛЕННЯ ПОЗИЦІЙ
   ============================================================ */
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

/* ============================================================
   2️⃣ ІНІЦІАЛІЗАЦІЯ ТА DRAG
   ============================================================ */
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

/* ============================================================
   3️⃣ ХУКИ ТА СПОСТЕРЕЖЕННЯ
   ============================================================ */
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
    <div class="main-container viewport" :style="cameraStyle">
        <svg v-if="peoples?.length > 1" class="line-canvas">
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
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

        <div
            v-for="(person, index) in peoples"
            :key="person.id"
            :ref="(el) => (boxRefs[person.id] = el)"
            class="draggable-box"
            :style="{ transform: `translate(${positions[person.id]?.x ?? 0}px, ${positions[person.id]?.y ?? 0}px)` }"
        >
            <div class="drag-handle">{{ person.surname }}</div>
            <small>{{ person.name }}</small>
            <small>{{ person.id }}</small>
        </div>
    </div>
</template>

<style>
.main-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    cursor: grab;
}
.main-container:active {
    cursor: grabbing;
}
.viewport {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    transition: transform 0.02s linear;
}
.draggable-box {
    width: 200px;
    padding-bottom: 10px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: absolute;
    transform-origin: top left;
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
.draggable-box small {
    margin-top: 8px;
    color: #718096;
}
.line-canvas {
    width: 100%;
    height: 100%;
    position: absolute;
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
