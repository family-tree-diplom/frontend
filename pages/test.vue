<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';

const { peoples, relations } = useFamilyData();

const boxRefs = ref([]);
const lineRefs = ref([]);
const circleRefs = ref<Record<string, SVGCircleElement>>({});
const marriageCenters = ref<Record<string, { x: number; y: number }>>({});

function makePairKey(a: number, b: number): string {
    return [a, b].sort((x, y) => x - y).join('-');
}

function findParentsOf(childId: number) {
    const parents = relations.value.filter((r) => r.type === 'parent' && r.to === childId).map((r) => r.from);
    if (parents.length === 2) {
        const [parentA, parentB] = parents.sort((a, b) => a - b);
        return { parentA, parentB };
    }
    return null;
}

const updateAllLines = () => {
    marriageCenters.value = {};

    // === 1. Линии браков и родителей ===
    relations.value.forEach((rel, i) => {
        // el1 = 'from' (батько або один з подружжя)
        // el2 = 'to' (дитина або інший з подружжя)
        const el1 = boxRefs.value[rel.from] as HTMLElement;
        const el2 = boxRefs.value[rel.to] as HTMLElement;
        const line = lineRefs.value[i] as SVGLineElement;

        // Перевірка, чи всі елементи готові
        if (!line || !rel.type || !el1 || !el2) return;

        if (rel.type === 'marriage') {
            // === Логіка для шлюбів (залишилась без змін) ===
            const x1 = el1.offsetLeft + el1.offsetWidth / 2;
            const y1 = el1.offsetTop + el1.offsetHeight / 2;
            const x2 = el2.offsetLeft + el2.offsetWidth / 2;
            const y2 = el2.offsetTop + el2.offsetHeight / 2;

            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
            line.style.display = 'block'; // Показати лінію

            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;

            const key = makePairKey(rel.from, rel.to);
            const circle = circleRefs.value[key];

            if (circle) {
                circle.setAttribute('cx', String(cx));
                circle.setAttribute('cy', String(cy));
            }

            marriageCenters.value[key] = { x: cx, y: cy };

        } else if (rel.type === 'parent') {
            // === НОВА ЛОГІКА ДЛЯ БАТЬКІВСЬКИХ ЗВ'ЯЗКІВ ===

            // Перевіряємо, чи має дитина (rel.to) двох батьків
            const parents = findParentsOf(rel.to);

            if (parents) {
                // Якщо дитина має ДВОХ батьків (наприклад, Ілля (1) або Пузожитель (6)),
                // то цей зв'язок буде намальовано складним вузлом в "Етапі 3".
                // Тому ми ХОВАЄМО просту пряму лінію, яка була створена
                // в <template>, щоб уникнути дублювання.
                line.style.display = 'none';
            } else {
                // Якщо дитина має ОДНОГО батька (наш випадок, Віктор (3) має
                // лише батька Віктора (8)), ми малюємо пряму лінію.

                // Координати: від низу батька (el1) до верху дитини (el2)
                const x1 = el1.offsetLeft + el1.offsetWidth / 2;
                const y1 = el1.offsetTop + el1.offsetHeight; // Низ батька
                const x2 = el2.offsetLeft + el2.offsetWidth / 2;
                const y2 = el2.offsetTop; // Верх дитини

                line.setAttribute('x1', String(x1));
                line.setAttribute('y1', String(y1));
                line.setAttribute('x2', String(x2));
                line.setAttribute('y2', String(y2));
                line.style.display = 'block'; // Показати лінію
            }
        } else {
            // Якщо є якісь інші типи зв'язків, ховаємо їх
            line.style.display = 'none';
        }
    });

    // === 2. Группы сиблингов (детей у пары) ===
    // Ця частина не потребувала змін
    const siblingGroups: Record<string, number[]> = {};

    relations.value
        .filter((r) => r.type === 'parent')
        .forEach((r) => {
            const parents = findParentsOf(r.to);
            if (parents) {
                const key = makePairKey(parents.parentA, parents.parentB);
                if (!siblingGroups[key]) siblingGroups[key] = [];
                // Уникаємо дублікатів, якщо зв'язок "parent" є для обох батьків
                if (!siblingGroups[key].includes(r.to)) {
                    siblingGroups[key].push(r.to);
                }
            }
        });

    // === 3. Отрисовка узлов семьи (брак → дети) ===
    // Ця частина не потребувала змін
    // === 3. Отрисовка узлов семьи (брак → дети) ===
    Object.entries(siblingGroups).forEach(([key, children]) => {
        // 'children' - це масив ID [1, 4, 7] або [6]
        // 'els' - це масив HTMLElements [el1, el4, el7] або [el6]
        const els = children.map((id) => boxRefs.value[id]).filter(Boolean);
        if (els.length === 0) return;

        // --- центр между детьми (ось сиблингов) ---
        const first = els[0];
        const last = els[els.length - 1];
        const x1 = first.offsetLeft + first.offsetWidth / 2;
        const x2 = last.offsetLeft + last.offsetWidth / 2;
        const centerX = (x1 + x2) / 2;

        // === ВИПРАВЛЕННЯ ДЛЯ 1 ДИТИНИ ===
        // Якщо дитина одна, 'yAxis' (точка з'єднання)
        // має бути на верхній частині блоку дитини, а не над нею.
        let yAxis: number;
        if (els.length === 1) {
            yAxis = els[0].offsetTop; // Прямо на верхній край
        } else {
            yAxis = Math.min(...els.map((el) => el.offsetTop)) - 40; // Вісь над дітьми
        }
        // ===================================

        // --- линия от брака до центра оси ---
        const marriage = marriageCenters.value[key];
        if (marriage) {
            let vertLine = document.querySelector(`line[data-marriage-to-sibling="${key}"]`) as SVGLineElement;
            if (!vertLine) {
                vertLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                vertLine.classList.add('connector-line', 'sibling-connector');
                vertLine.dataset.marriageToSibling = key;
                document.querySelector('.line-canvas')?.appendChild(vertLine);
            }
            // Тепер 'yAxis' буде 'childY' для 1 дитини,
            // і лінія з'єднається напряму з блоком.
            vertLine.setAttribute('x1', String(marriage.x));
            vertLine.setAttribute('y1', String(marriage.y));
            vertLine.setAttribute('x2', String(centerX));
            vertLine.setAttribute('y2', String(yAxis));
        }

        // --- горизонтальная линия между детьми (ось сиблингов) ---
        // (Для 1 дитини x1=x2, yAxis=childY, лінія буде "крапкою" - це нормально)
        let siblingLine = document.querySelector(`line[data-sibling="${key}"]`) as SVGLineElement;
        if (!siblingLine) {
            siblingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            siblingLine.classList.add('connector-line', 'sibling-line');
            siblingLine.dataset.sibling = key;
            document.querySelector('.line-canvas')?.appendChild(siblingLine);
        }
        siblingLine.setAttribute('x1', String(x1));
        siblingLine.setAttribute('y1', String(yAxis));
        siblingLine.setAttribute('x2', String(x2));
        siblingLine.setAttribute('y2', String(yAxis));

        // --- короткие линии от оси к каждому ребёнку ---
        // === ВИПРАВЛЕННЯ ІТЕРАЦІЇ ===
        // Ітеруємо по масиву ID (children) і масиву елементів (els)
        // одночасно, щоб отримати надійний 'keyChild'.
        children.forEach((childId, index) => {
            const childEl = els[index]; // Отримуємо відповідний елемент
            if (!childEl) return;

            const childX = childEl.offsetLeft + childEl.offsetWidth / 2;
            const childY = childEl.offsetTop;

            // Використовуємо 'childId' для ключа, це надійніше,
            // ніж 'childEl.textContent'
            const keyChild = `${key}-${childId}`;

            let childLine = document.querySelector(`line[data-sibling-child="${keyChild}"]`) as SVGLineElement;
            if (!childLine) {
                childLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                childLine.classList.add('connector-line', 'sibling-child-line');
                childLine.dataset.siblingChild = keyChild;
                document.querySelector('.line-canvas')?.appendChild(childLine);
            }

            // (Для 1 дитини yAxis=childY, лінія буде "крапкою" - це нормально)
            childLine.setAttribute('x1', String(childX));
            childLine.setAttribute('y1', String(yAxis));
            childLine.setAttribute('x2', String(childX));
            childLine.setAttribute('y2', String(childY));
        });
    });
};


const { makeDraggable } = useDraggable(updateAllLines);

function initDragAndLines() {
    if (process.client) {
        nextTick(() => {
            boxRefs.value = [];
            lineRefs.value = [];
            // === ВИПРАВЛЕННЯ ТУТ ===
            circleRefs.value = {}; // Має бути об'єктом, а не масивом

            const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');
            draggableElements.forEach((el) => makeDraggable(el, updateAllLines));
            updateAllLines();
        });
    }
}

function cleanupDrag() {
    const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');
    draggableElements.forEach((el) => {
        el.onmousedown = null;
        el.onmouseup = null;
        el.onmousemove = null;
    });
}

onMounted(initDragAndLines);
onBeforeUnmount(cleanupDrag);

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
    <pre>{{peoples}}</pre>
    <div class="main-container">
        <svg v-if="peoples?.length > 1" class="line-canvas">
            <line
                v-for="(relation, index) in relations"
                :key="`${relation.from}-${relation.to}`"
                :ref="(el) => (lineRefs[index] = el)"
                class="connector-line"
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
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
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
