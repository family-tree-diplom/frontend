<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';
import { useFamilyLines } from '~/composables/useFamilyLines';
import { useCamera } from '~/composables/useCamera';

// === Отримуємо дані про людей та зв’язки ===
const { peoples, relations } = useFamilyData();

// === Реактивні змінні для посилань на DOM-елементи ===
const boxRefs = ref<Record<number, SVGGElement>>({});
const lineRefs = ref([]);
const circleRefs = ref<Record<string, SVGCircleElement>>({});

const { camera, cameraStyle, onWheel, onMouseDown, onMouseMove, onMouseUp } = useCamera();

// === Ключ для збереження позицій у sessionStorage ===
const STORAGE_KEY = 'family_positions_svg';

/* ============================================================
    ЗБЕРЕЖЕННЯ ТА ВІДНОВЛЕННЯ ПОЗИЦІЙ
   ============================================================ */

function savePositions() {
    const positions: Record<number, { x: number; y: number }> = {};
    Object.entries(boxRefs.value).forEach(([id, el]) => {
        if (el) {
            const transform = el.getAttribute('transform');
            if (transform) {
                const match = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
                if (match) {
                    const [, x, y] = match;
                    positions[Number(id)] = { x: parseFloat(x), y: parseFloat(y) };
                }
            }
        }
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

function loadPositions() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<number, { x: number; y: number }>;
    } catch {
        return {};
    }
}

const { updateAllLines, marriageCenters, makePairKey } = useFamilyLines(boxRefs, lineRefs, circleRefs, relations);

/* ============================================================
    DRAG-ЛОГІКА ЗІ ЗБЕРЕЖЕННЯМ ПОЗИЦІЙ
   ============================================================ */

const { makeDraggable } = useDraggable(updateAllLines, camera);

function initDragAndLines() {
    if (process.client) {
        nextTick(() => {
            boxRefs.value = {};
            lineRefs.value = [];
            circleRefs.value = {};

            const savedPositions = loadPositions();

            setTimeout(async () => {
                const draggableElements = document.querySelectorAll<SVGGElement>('.draggable-card');

                draggableElements.forEach((el) => {
                    const idAttr = el.getAttribute('data-id');
                    const id = idAttr ? Number(idAttr) : NaN;

                    if (!isNaN(id) && savedPositions[id]) {
                        const pos = savedPositions[id];
                        el.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
                    }

                    makeDraggable(el);
                });

                await nextTick(updateAllLines);
            }, 50);
        });
    }
}

function cleanupDrag() {
    const draggableElements = document.querySelectorAll<SVGGElement>('.draggable-card');
    draggableElements.forEach((el) => {
        el.onmousedown = null;
        el.onmouseup = null;
        el.onmousemove = null;
    });
}

/* ============================================================
    ХУКИ ЖИТТЄВОГО ЦИКЛУ
   ============================================================ */

onMounted(initDragAndLines);
onBeforeUnmount(cleanupDrag);

if (process.client) {
    window.addEventListener('beforeunload', savePositions);
}

if (import.meta.hot) {
    import.meta.hot.accept(() => {
        nextTick(() => {
            cleanupDrag();
            initDragAndLines();
        });
    });
}

watch(
    peoples,
    (newPeoples) => {
        if (newPeoples && newPeoples.length > 0) {
            initDragAndLines();
        }
    },
    { immediate: true }
);
</script>

<template>
    <div
        class="main-container viewport"
        @wheel="onWheel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        :style="cameraStyle"
    >
        <svg v-if="peoples?.length > 1" class="line-canvas">
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
                </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#grid)" />

            <!-- Лінії між людьми -->
            <line
                v-for="(relation, index) in relations"
                :key="`${relation.from}-${relation.to}`"
                :ref="(el) => (lineRefs[index] = el)"
                class="connector-line"
                :data-relation-key="`${relation.from}-${relation.to}`"
            />
            <!-- Кола для шлюбів -->
            <circle
                v-for="(relation, index) in relations.filter((r) => r.type === 'marriage')"
                :key="index"
                :ref="(el) => (circleRefs[makePairKey(relation.from, relation.to)] = el)"
                r="6"
                class="connector-circle"
            />

            <!-- SVG-картки людей -->
            <g
                v-for="(person, index) in peoples"
                :key="person.id"
                :data-id="person.id"
                :ref="(el) => (boxRefs[person.id] = el)"
                class="draggable-card"
                :transform="`translate(${150 + index * 150}, ${100 + index * 100})`"
                pointer-events="all"
            >
                <rect
                    width="200"
                    height="80"
                    rx="8"
                    ry="8"
                    fill="white"
                    stroke="#ddd"
                    stroke-width="1.5"
                    pointer-events="all"
                />

                <!-- Заголовок -->
                <rect x="0" y="0" width="200" height="30" fill="#2d3748" rx="8" ry="8"></rect>
                <text
                    x="100"
                    y="20"
                    text-anchor="middle"
                    fill="white"
                    font-weight="bold"
                    font-size="14"
                    class="drag-handle"
                >
                    {{ person.surname }}
                </text>

                <!-- Ім’я -->
                <text x="100" y="50" text-anchor="middle" fill="#4a5568" font-size="12">
                    {{ person.name }}
                </text>

                <!-- ID -->
                <text x="100" y="65" text-anchor="middle" fill="#718096" font-size="10">
                    {{ person.id }}
                </text>
            </g>
        </svg>
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
    transition: transform 0.02s linear;
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

.draggable-card {
    cursor: grab;
    user-select: none;
}

.draggable-card:active {
    cursor: grabbing;
}
</style>
