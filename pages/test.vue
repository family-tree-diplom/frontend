<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';
import { useFamilyLines } from '~/composables/useFamilyLines';
import { useCamera } from '~/composables/useCamera';

// === Отримуємо дані про людей та зв’язки ===
const { peoples, relations } = useFamilyData();

// === Реактивні змінні для посилань на DOM-елементи ===
const boxRefs = ref([]); // посилання на div-блоки (людей)
const lineRefs = ref([]); // посилання на svg-лінії
const circleRefs = ref<Record<string, SVGCircleElement>>({});

const { camera, cameraStyle, onWheel, onMouseDown, onMouseMove, onMouseUp } = useCamera();

// === Ключ для збереження позицій у sessionStorage ===
const STORAGE_KEY = 'family_positions';

/* ============================================================
   1️⃣ ЗБЕРЕЖЕННЯ ТА ВІДНОВЛЕННЯ ПОЗИЦІЙ
   ============================================================ */

// Зберігає поточні координати draggable-карток у sessionStorage
function savePositions() {
    const positions: Record<number, { top: number; left: number }> = {};
    boxRefs.value.forEach((el: HTMLElement, id: number) => {
        if (el) {
            positions[id] = {
                top: el.offsetTop,
                left: el.offsetLeft,
            };
        }
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

// Завантажує позиції з sessionStorage
function loadPositions() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<number, { top: number; left: number }>;
    } catch {
        return {};
    }
}

const { updateAllLines, marriageCenters, makePairKey } = useFamilyLines(boxRefs, lineRefs, circleRefs, relations);

/* ============================================================
   4️⃣ DRAG-LOGІКА ЗІ ЗБЕРЕЖЕННЯМ ПОЗИЦІЙ
   ============================================================ */

const { makeDraggable } = useDraggable(updateAllLines, camera);

function initDragAndLines() {
    if (process.client) {
        nextTick(() => {
            boxRefs.value = [];
            lineRefs.value = [];
            circleRefs.value = {};

            // 1️⃣ Завантажуємо збережені координати з sessionStorage
            const savedPositions = loadPositions();

            // 2️⃣ Чекаємо DOM (бо draggable-box можуть зʼявитися трохи пізніше)
            setTimeout(async () => {
                const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');

                draggableElements.forEach((el) => {
                    // Отримуємо ID з вмісту блоку
                    const idText = el.querySelector('small:last-child')?.textContent;
                    const id = idText ? Number(idText.trim()) : NaN;

                    // Якщо є позиція в sessionStorage — застосовуємо
                    if (!isNaN(id) && savedPositions[id]) {
                        const pos = savedPositions[id];
                        el.style.position = 'absolute';
                        el.style.top = `${pos.top}px`;
                        el.style.left = `${pos.left}px`;
                    }

                    // Робимо елемент перетягуваним
                    makeDraggable(el);
                });

                // 3️⃣ Малюємо всі лінії після застосування позицій
                await nextTick(updateAllLines);
            }, 50); // невелика пауза, щоб DOM встиг змонтуватися
        });
    }
}

// Очищаємо події при демонтажі
function cleanupDrag() {
    const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');
    draggableElements.forEach((el) => {
        el.onmousedown = null;
        el.onmouseup = null;
        el.onmousemove = null;
    });
}
/* ============================================================
   5️⃣ ХУКИ ЖИТТЄВОГО ЦИКЛУ
   ============================================================ */

onMounted(initDragAndLines);
onBeforeUnmount(cleanupDrag);

// Зберігаємо позиції перед закриттям/оновленням сторінки
if (process.client) {
    window.addEventListener('beforeunload', savePositions);
}

// При оновленні hot-reload — перевстановлюємо drag & lines
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        nextTick(() => {
            cleanupDrag();
            initDragAndLines();
        });
    });
}

// Якщо змінюється peoples — перезапускаємо ініціалізацію
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
    <!--    <pre>{{peoples}}</pre>-->
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
            :style="{ top: `${100 + index * 80}px`, left: `${150 + index * 100}px` }"
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
