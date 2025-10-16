<script setup lang="ts">
// import { ref, watch, nextTick } from 'vue'

// Ваш код завантаження даних
const config = useRuntimeConfig();
const {data:peoples} = await useAsyncData(
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

// Функція для оновлення ВСІХ ліній
const updateAllLines = () => {
    for (let i = 0; i < lineRefs.value?.length; i++) {
        const el1 = boxRefs.value[i] as HTMLElement;
        const el2 = boxRefs.value[i + 1] as HTMLElement;
        const line = lineRefs.value[i] as SVGLineElement;

        if (el1 && el2 && line) {
            const x1 = el1.offsetLeft + el1.offsetWidth / 2;
            const y1 = el1.offsetTop + el1.offsetHeight / 2;
            const x2 = el2.offsetLeft + el2.offsetWidth / 2;
            const y2 = el2.offsetTop + el2.offsetHeight / 2;

            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
        }
    }
};

// Ваша функція, адаптована для роботи з callback
function makeDraggable(el: HTMLElement, onDragCallback: () => void) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const dragHandle = el.querySelector('.drag-handle') as HTMLElement || el;

    const elementDrag = (e: MouseEvent) => {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = `${el.offsetTop - pos2}px`;
        el.style.left = `${el.offsetLeft - pos1}px`;
        onDragCallback();
    };

    const closeDragElement = () => {
        document.onmouseup = null;
        document.onmousemove = null;
    };

    const dragMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    };

    dragHandle.onmousedown = dragMouseDown;
    el.style.position = 'absolute';
    el.style.cursor = 'move';
}

// Спостерігаємо за `peoples`. Коли дані завантажаться, цей код виконається.
watch(peoples, (newPeoples) => {
    // Перевіряємо, чи є дані
    if (newPeoples && newPeoples?.length > 0) {
        // nextTick гарантує, що DOM оновився після зміни `peoples`
        nextTick(() => {
            // Очищуємо масиви refs перед заповненням
            boxRefs.value = [];
            lineRefs.value = [];

            // Робимо всі елементи рухомими
            const draggableElements = document.querySelectorAll<HTMLElement>('.draggable-box');
            draggableElements.forEach(el => makeDraggable(el, updateAllLines));

            // Малюємо початкові лінії
            updateAllLines();
        });
    }
}, { immediate: true }); // immediate: true - щоб виконати перевірку одразу при завантаженні
</script>

<template>
    <pre>{{ peoples }}</pre>
    <div class="main-container">
        <svg class="line-canvas">
            <line
                v-if="peoples?.length > 1"
                v-for="(_, index) in peoples?.length - 1"
                :key="`line-${index}`"
                :ref="el => lineRefs[index] = el"
                class="connector-line"
            />
        </svg>

        <div
            v-for="(person, index) in peoples"
            :key="person.id"
            :ref="el => boxRefs[index] = el"
            class="draggable-box"
            :style="{ top: `${100 + index * 80}px`, left: `${150 + index * 100}px` }"
        >
            <div class="drag-handle">{{ person.surname }}</div>
            <small>{{ person.name }}</small>
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
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
</style>
