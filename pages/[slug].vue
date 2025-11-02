<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';
import { useFamilyLines } from '~/composables/useFamilyLines';
import { useCamera } from '~/composables/useCamera';
import { process } from 'std-env';

const config = useRuntimeConfig();
const route = useRoute();

const { data: tree } = await useAsyncData(
    'Trees',
    async () => {
        const response = await $fetch('api/trees', {
            baseURL: process.server ? config.public.API_BASE_URL : '',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
                jsonrpc: '2.0',
                method: 'getTree',
                params: {
                    slug: route.params.slug,
                },
            },
        });
        return response[0].result[0];
    },
    { default: () => [] }
);

const { peoples, relations, peoplesRefresh } = await useFamilyData(tree.value.id);
const peoplesNew = ref([]);

const boxRefs = ref([]); // посилання на div-блоки
const lineRefs = ref([]); // посилання на svg-лінії
const circleRefs = ref<Record<string, SVGCircleElement>>({});

const loading = ref(false);

const add = () => {
    peoplesNew.value.push({
        name: '',
        surname: '',
        birth_day: '',
        death: '',
        gender: 'unknown',
    });
};

const save = async () => {
    await submit('save', {
        peoples: peoplesNew.value,
        treeId: tree.value.id,
    })
};

const deletePerson = async () => {
   await submit('deletePerson', {
       selectedIds: Array.from(selectedIds),
       treeId: tree.value.id,
   })
};

const submit = async (method:String, params:Object)=>{
    if (loading.value) return;
    loading.value = true;
    const response = await $fetch('api/peoples', {
        baseURL: process.server ? config.public.API_BASE_URL : '',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            jsonrpc: '2.0',
            method: method,
            params: {
                ...params,
            },
        },
    });
    if (response[0].error) {
        console.error(response[0].error);
    } else {
        await peoplesRefresh();
        peoplesNew.value = [];
    }
    loading.value = false;
}

interface Position {
    x: number;
    y: number;
}
const positions = reactive<Record<number, Position>>({});

const STORAGE_KEY = computed(() => `family_positions_${route.params.slug}`);

const { camera, cameraStyle } = useCamera();
const { updateAllLines, marriageCenters, makePairKey } = useFamilyLines(
    boxRefs,
    lineRefs,
    circleRefs,
    relations,
    positions
);

function savePositions() {
    if (!process.client || !tree.value?.id) return;
    const data = {
        treeId: tree.value.id,
        slug: route.params.slug,
        positions: toRaw(positions),
        updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(data));
}

function loadPositions() {
    if (!process.client) return {};
    const raw = localStorage.getItem(STORAGE_KEY.value);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed.slug !== route.params.slug) return {};
        return parsed.positions || {};
    } catch {
        return {};
    }
}

// --- Ініціалізація позицій після повного завантаження дерева
async function initPositions() {
    await nextTick();
    const saved = loadPositions();

    peoples.value.forEach((p, index) => {
        if (saved[p.id]) {
            positions[p.id] = { x: saved[p.id].x, y: saved[p.id].y };
        } else if (!positions[p.id]) {
            positions[p.id] = { x: 150 + index * 100, y: 100 + index * 80 };
        }
    });

    nextTick(initDragAndLines);
}

const selectedIds = reactive(new Set<number>());

function toggleSelect(id: number, multi = false) {
    if (!multi) selectedIds.clear();
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
}

const { makeDraggable } = useDraggable(
    () => {
        updateAllLines();
        savePositions(); // зберігати після кожного руху
    },
    camera,
    positions,
    selectedIds,
    toggleSelect
);

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

// --- Виклик при зміні peoples або slug
watch(
    [peoples, () => route.params.slug],
    () => {
        if (!peoples.value || peoples.value.length === 0) return;
        initPositions();
    },
    { immediate: true }
);

// --- Гарантоване відновлення після reload
onMounted(() => {
    initPositions();
    window.addEventListener('beforeunload', savePositions);
});

onBeforeUnmount(() => {
    savePositions();
    window.removeEventListener('beforeunload', savePositions);
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

useHead({
    title: tree.value.title,
});
</script>

<template>
    <pre>{{ selectedIds }}</pre>
    <core-tools :loading="loading" @add="add" @save="save" @deletePerson="deletePerson"></core-tools>
    <div class="main-container viewport">
        <div class="canvas-wrapper" :style="[cameraStyle]" @mousedown.self="selectedIds.clear()">
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
            <base-card-editor
                v-if="peoplesNew.length"
                v-for="(person, index) in peoplesNew"
                :key="index"
                :model-value="person"
            ></base-card-editor>
            <base-card
                v-for="person in peoples"
                :key="person.id"
                :selected="selectedIds.has(person.id)"
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
    z-index: 1;
}
.canvas-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 50000px;
    height: 50000px;
    transform-origin: 0 0;
    z-index: 0;
    cursor: grab;
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
