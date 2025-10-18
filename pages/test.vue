<script setup lang="ts">
// import { ref, watch, nextTick } from 'vue'

// Ваш код завантаження даних
const config = useRuntimeConfig();
const { data: peoples } = await useAsyncData(
    'peoples',
    async () => {
        const response = await $fetch('api/peoples', {
            baseURL: process.server ? config.public.API_BASE_URL : '',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: {
                jsonrpc: '2.0',
                method: 'default',
                params: {},
            },
        });

        return response[0].result;
    },
    {
        default: () => [],
    }
);

// Створюємо масиви для зберігання посилань на DOM-елементи
const boxRefs = ref([]);
const lineRefs = ref([]);
const circleRefs = ref([]);
const marriageCenters = ref<Record<String, { x: number; y: number }>>([]);

const relations = computed(() => {
    const result: { from: number; to: number; type: string }[] = [];

    peoples.value.forEach((person) => {
        // якщо немає relations — пропускаємо
        if (!Array.isArray(person.relations)) return;

        person.relations.forEach((relation) => {
            // додаємо зв’язок, де person.id — джерело, а relation.id — ціль
            result.push({
                from: person.id,
                to: relation.id,
                type: relation.type,
            });
        });
    });

    return result;
});

function findParrentsOf(childId: number) {
    const parrents = relations.value
        .filter((relation) => relation.type === 'parrent' && relation.to === childId)
        .map((relation) => relation.from);

    if (parrents.length === 2) {
        const [p1, p2] = parrents.sort((a, b) => a - b);
        return { parrentA: p1, parrentB: p2 };
    }
    return null;
}

// Функція для оновлення ВСІХ ліній
// const updateAllLines = () => {
//     marriageCenters.value = {}
//
//     relations.value.forEach((rel, i) => {
//         const el1 = boxRefs.value[rel.from] as HTMLElement;
//         const el2 = boxRefs.value[rel.to] as HTMLElement;
//         const line = lineRefs.value[i] as SVGLineElement;
//         const circle = circleRefs.value[i] as SVGLineElement;
//
//         if (rel.type === 'marriage' && line) {
//             const x1 = el1.offsetLeft + el1.offsetWidth / 2;
//             const y1 = el1.offsetTop + el1.offsetHeight / 2;
//             const x2 = el2.offsetLeft + el2.offsetWidth / 2;
//             const y2 = el2.offsetTop + el2.offsetHeight / 2;
//
//             line.setAttribute('x1', String(x1));
//             line.setAttribute('y1', String(y1));
//             line.setAttribute('x2', String(x2));
//             line.setAttribute('y2', String(y2));
//
//             const cx = (x1 + x2) / 2;
//             const cy = (y1 + y2) / 2;
//             if (circle) {
//                 circle.setAttribute('cx', String(cx));
//                 circle.setAttribute('cy', String(cy));
//             }
//
//             const key = [rel.from, rel.to].sort((a, b) => a - b).join('-');
//             marriageCenters.value[key] = {cx: cx, cy: cy};
//         }else if (el1 && el2 && line) {
//             const x1 = el1.offsetLeft + el1.offsetWidth / 2;
//             const y1 = el1.offsetTop + el1.offsetHeight / 2;
//             const x2 = el2.offsetLeft + el2.offsetWidth / 2;
//             const y2 = el2.offsetTop + el2.offsetHeight / 2;
//
//             line.setAttribute('x1', String(x1));
//             line.setAttribute('y1', String(y1));
//             line.setAttribute('x2', String(x2));
//             line.setAttribute('y2', String(y2));
//         }
//     });
// };
// 🔹 Утилита: создаёт стабильный ключ для пары
function makePairKey(a: number, b: number): string {
    return [a, b].sort((x, y) => x - y).join('-');
}

// 🔹 Ищем обоих родителей ребёнка по типу 'parent'
function findParentsOf(childId: number) {
    const parents = relations.value
        .filter((r) => r.type === 'parent' && r.to === childId)
        .map((r) => r.from);

    if (parents.length === 2) {
        const [parentA, parentB] = parents.sort((a, b) => a - b);
        return { parentA, parentB };
    }

    return null;
}

// 🔹 Основная функция — обновление линий и брачных точек
const updateAllLines = () => {
    marriageCenters.value = {}; // очищаем перед пересчётом

    relations.value.forEach((rel, i) => {
        const el1 = boxRefs.value[rel.from] as HTMLElement;
        const el2 = boxRefs.value[rel.to] as HTMLElement;
        const line = lineRefs.value[i] as SVGLineElement;
        const circle = circleRefs.value[i] as SVGCircleElement;

        if (!line || !rel.type) return;

        // ===== 1. Брак =====
        if (rel.type === 'marriage' && el1 && el2) {
            const x1 = el1.offsetLeft + el1.offsetWidth / 2;
            const y1 = el1.offsetTop + el1.offsetHeight / 2;
            const x2 = el2.offsetLeft + el2.offsetWidth / 2;
            const y2 = el2.offsetTop + el2.offsetHeight / 2;

            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));

            // Центр брака
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;

            if (circle) {
                circle.setAttribute('cx', String(cx));
                circle.setAttribute('cy', String(cy));
            }

            // Сохраняем центр брака
            const key = makePairKey(rel.from, rel.to);
            marriageCenters.value[key] = { x: cx, y: cy };
        }

        // ===== 2. Родитель → ребёнок =====
        else if (rel.type === 'parent' && el2) {
            const parents = findParentsOf(rel.to);
            if (parents) {
                const key = makePairKey(parents.parentA, parents.parentB);
                const center = marriageCenters.value[key];

                if (center) {
                    const x2 = el2.offsetLeft + el2.offsetWidth / 2;
                    const y2 = el2.offsetTop;

                    line.setAttribute('x1', String(center.x));
                    line.setAttribute('y1', String(center.y));
                    line.setAttribute('x2', String(x2));
                    line.setAttribute('y2', String(y2));

                }
            }
        }

        // ===== 3. Любая другая связь =====
        else if (el1 && el2) {
            const x1 = el1.offsetLeft + el1.offsetWidth / 2;
            const y1 = el1.offsetTop + el1.offsetHeight / 2;
            const x2 = el2.offsetLeft + el2.offsetWidth / 2;
            const y2 = el2.offsetTop + el2.offsetHeight / 2;

            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
        }
    });
};
// Ваша функція, адаптована для роботи з callback
function makeDraggable(el: HTMLElement, onDragCallback: () => void) {
    let oldX = 0,
        oldY = 0,
        x = 0,
        y = 0;
    const dragHandle = (el.querySelector('.drag-handle') as HTMLElement) || el;

    const elementDrag = (e: MouseEvent) => {
        e.preventDefault();
        oldX = x - e.clientX;
        oldY = y - e.clientY;
        x = e.clientX;
        y = e.clientY;
        el.style.top = `${el.offsetTop - oldY}px`;
        el.style.left = `${el.offsetLeft - oldX}px`;
        onDragCallback();
    };

    const closeDragElement = () => {
        document.onmouseup = null;
        document.onmousemove = null;
    };

    const dragMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        x = e.clientX;
        y = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    };

    dragHandle.onmousedown = dragMouseDown;
    el.style.position = 'absolute';
    el.style.cursor = 'move';

    onUnmounted(() => {});
}

// Спостерігаємо за `peoples`. Коли дані завантажаться, цей код виконається.
watch(
    peoples,
    (newPeoples) => {
        // Перевіряємо, чи є дані
        if (newPeoples && newPeoples?.length > 0) {
            // nextTick гарантує, що DOM оновився після зміни `peoples`
            nextTick(() => {
                // Очищуємо масиви refs перед заповненням
                boxRefs.value = [];
                lineRefs.value = [];

                // Робимо всі елементи рухомими
                const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');
                draggableElements.forEach((el) => makeDraggable(el, updateAllLines));

                // Малюємо початкові лінії
                updateAllLines();
            });
        }
    },
    { immediate: true }
); // immediate: true - щоб виконати перевірку одразу при завантаженні
</script>

<template>
    <pre>{{ peoples }}</pre>
    <pre>{{ relations }}</pre>
    <div class="main-container">
        <svg v-if="peoples?.length > 1" class="line-canvas">
            <line
                v-for="(relation, index) in relations"
                :key="`${relation.from}-${relation.to}`"
                :ref="(el) => (lineRefs[index] = el)"
                class="connector-line"
            />
            <circle
                v-for="(relation, index) in relations"
                :key="index"
                :ref="(el) => (circleRefs[index] = el)"
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
