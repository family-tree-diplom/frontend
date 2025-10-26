<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';

// === Отримуємо дані про людей та зв’язки ===
const { peoples, relations } = useFamilyData();

// === Реактивні змінні для посилань на DOM-елементи ===
const boxRefs = ref([]); // посилання на div-блоки (людей)
const lineRefs = ref([]); // посилання на svg-лінії
const circleRefs = ref<Record<string, SVGCircleElement>>({});
const marriageCenters = ref<Record<string, { x: number; y: number }>>({});

// === Реактивні змінні для управління камерою ===
const camera = reactive({
    x: 0,
    y: 0,
    scale: 1,
    isDragging: false,
    startX: 0,
    startY: 0,
});

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

/* ============================================================
   2️⃣ ДОПОМІЖНІ ФУНКЦІЇ
   ============================================================ */

// Формує унікальний ключ для пари (наприклад, 3-7)
function makePairKey(a: number, b: number): string {
    return [a, b].sort((x, y) => x - y).join('-');
}

// Знаходить двох батьків для дитини (за її ID)
function findParentsOf(childId: number) {
    const parents = relations.value.filter((r) => r.type === 'parent' && r.to === childId).map((r) => r.from);
    if (parents.length === 2) {
        const [parentA, parentB] = parents.sort((a, b) => a - b);
        return { parentA, parentB };
    }
    return null;
}

/* ============================================================
   3️⃣ ОНОВЛЕННЯ ВСІХ ЛІНІЙ (оптимізована версія)
   ============================================================ */

function clearDynamicLines() {
    // очищаем линии, добавленные динамически
    document.querySelectorAll('.sibling-line, .sibling-child-line, .sibling-connector').forEach((el) => el.remove());
}

/* === 1️⃣ Лінії шлюбу === */
function drawMarriageLines() {
    marriageCenters.value = {};

    relations.value
        .filter((r) => r.type === 'marriage')
        .forEach((rel) => {
            const el1 = boxRefs.value[rel.from];
            const el2 = boxRefs.value[rel.to];
            const line = lineRefs.value.find((l) => l?.dataset?.relationKey === `${rel.from}-${rel.to}`) as
                | SVGLineElement
                | undefined;

            if (!el1 || !el2 || !line) return;

            const x1 = el1.offsetLeft + el1.offsetWidth / 2;
            const y1 = el1.offsetTop + el1.offsetHeight / 2;
            const x2 = el2.offsetLeft + el2.offsetWidth / 2;
            const y2 = el2.offsetTop + el2.offsetHeight / 2;

            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
            line.style.display = 'block';

            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;

            const key = makePairKey(rel.from, rel.to);
            const circle = circleRefs.value[key];
            if (circle) {
                circle.setAttribute('cx', String(cx));
                circle.setAttribute('cy', String(cy));
            }
            marriageCenters.value[key] = { x: cx, y: cy };
        });
}

/* === 2️⃣ Лінії батьків === */
function drawParentLines() {
    relations.value
        .filter((r) => r.type === 'parent')
        .forEach((rel) => {
            const el1 = boxRefs.value[rel.from];
            const el2 = boxRefs.value[rel.to];
            const line = lineRefs.value.find((l) => l?.dataset?.relationKey === `${rel.from}-${rel.to}`);

            if (!el1 || !el2 || !line) return;

            const parents = findParentsOf(rel.to);
            if (parents) {
                // обидва батьки вже мають спільний зв’язок — ховаємо лінію
                line.style.display = 'none';
                return;
            }

            const x1 = el1.offsetLeft + el1.offsetWidth / 2;
            const y1 = el1.offsetTop + el1.offsetHeight;
            const x2 = el2.offsetLeft + el2.offsetWidth / 2;
            const y2 = el2.offsetTop;

            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
            line.style.display = 'block';
        });
}

/* === 3️⃣ Лінії братів/сестер === */
function drawSiblingLines() {
    const siblingGroups: Record<string, number[]> = {};

    relations.value
        .filter((r) => r.type === 'parent')
        .forEach((r) => {
            const parents = findParentsOf(r.to);
            if (parents) {
                const key = makePairKey(parents.parentA, parents.parentB);
                if (!siblingGroups[key]) siblingGroups[key] = [];
                if (!siblingGroups[key].includes(r.to)) siblingGroups[key].push(r.to);
            }
        });

    Object.entries(siblingGroups).forEach(([key, children]) => {
        const els = children.map((id) => boxRefs.value[id]).filter(Boolean);
        if (!els.length) return;

        const first = els[0];
        const last = els[els.length - 1];
        const x1 = first.offsetLeft + first.offsetWidth / 2;
        const x2 = last.offsetLeft + last.offsetWidth / 2;
        const centerX = (x1 + x2) / 2;
        const yAxis = els.length === 1 ? els[0].offsetTop : Math.min(...els.map((el) => el.offsetTop)) - 40;

        // === вертикаль від шлюбу до осі дітей ===
        const marriage = marriageCenters.value[key];
        if (marriage) {
            const vertLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            vertLine.classList.add('connector-line', 'sibling-connector');
            vertLine.setAttribute('x1', String(marriage.x));
            vertLine.setAttribute('y1', String(marriage.y));
            vertLine.setAttribute('x2', String(centerX));
            vertLine.setAttribute('y2', String(yAxis));
            document.querySelector('.line-canvas')?.appendChild(vertLine);
        }

        // === горизонтальна лінія між братами/сестрами ===
        const siblingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        siblingLine.classList.add('connector-line', 'sibling-line');
        siblingLine.setAttribute('x1', String(x1));
        siblingLine.setAttribute('y1', String(yAxis));
        siblingLine.setAttribute('x2', String(x2));
        siblingLine.setAttribute('y2', String(yAxis));
        document.querySelector('.line-canvas')?.appendChild(siblingLine);

        // === вертикалі від осі до кожної дитини ===
        els.forEach((el) => {
            const childX = el.offsetLeft + el.offsetWidth / 2;
            const childY = el.offsetTop;
            const childLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            childLine.classList.add('connector-line', 'sibling-child-line');
            childLine.setAttribute('x1', String(childX));
            childLine.setAttribute('y1', String(yAxis));
            childLine.setAttribute('x2', String(childX));
            childLine.setAttribute('y2', String(childY));
            document.querySelector('.line-canvas')?.appendChild(childLine);
        });
    });
}

/* === Основна функція === */
function updateAllLines() {
    clearDynamicLines();
    drawMarriageLines();
    drawParentLines();
    drawSiblingLines();
}

/* ============================================================
   4️⃣ DRAG-LOGІКА ЗІ ЗБЕРЕЖЕННЯМ ПОЗИЦІЙ
   ============================================================ */

const { makeDraggable } = useDraggable(updateAllLines);

function initDragAndLines() {
    if (process.client) {
        nextTick(() => {
            boxRefs.value = [];
            lineRefs.value = [];
            circleRefs.value = {};

            // 1️⃣ Завантажуємо збережені координати з sessionStorage
            const savedPositions = loadPositions();

            // 2️⃣ Чекаємо DOM (бо draggable-box можуть зʼявитися трохи пізніше)
            setTimeout(() => {
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
                updateAllLines();
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
// === Обробники для руху камери ===
function onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const delta = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
    const newScale = Math.min(Math.max(camera.scale * delta, 0.2), 3); // обмеження масштабу
    camera.scale = newScale;
}

function onMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.draggable-box')) return; // ігнор якщо тягнемо людину
    camera.isDragging = true;
    camera.startX = e.clientX - camera.x;
    camera.startY = e.clientY - camera.y;
}

function onMouseMove(e: MouseEvent) {
    if (!camera.isDragging) return;
    camera.x = e.clientX - camera.startX;
    camera.y = e.clientY - camera.startY;
}

function onMouseUp() {
    camera.isDragging = false;
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
        :style="{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            transformOrigin: '0 0',
        }"
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
