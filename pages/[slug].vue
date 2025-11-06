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
    });
};

const deletePerson = async () => {
    await submit('deletePerson', {
        selectedIds: Array.from(selectedIds),
        treeId: tree.value.id,
    });
};

const relationsPopup = ref(false);

const addRelations = () => {
    relationsPopup.value = true;
};

const getPeoples = () => {
    const ids =  Array.from(selectedIds);
    return ids.map(id => peoples.value.find(item => item.id === id)).filter(Boolean);
}

const submit = async (method: String, params: Object) => {
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
};

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
<!--    <pre>{{ selectedIds }}</pre>-->
    <atom-popup v-model="relationsPopup">
        <div class="relation-box">
            <!-- Якщо вибрано 3 людини -->
            <div v-if="getPeoples().length === 3" class="relation-block relation-parent">
                <h4>Зв’язок між батьками і дитиною</h4>
                <div class="relation-content">
                    <p>
                        Від <span class="person">{{ getPeoples()[0].name }} {{ getPeoples()[0].surname }}</span>
                        <span class="date">({{ getPeoples()[0].birth_day }})</span>
                    </p>
                    <p>
                        і <span class="person">{{ getPeoples()[1].name }} {{ getPeoples()[1].surname }}</span>
                        <span class="date">({{ getPeoples()[1].birth_day }})</span>
                    </p>
                    <p>
                        прокласти батьківський зв’язок до
                        <span class="child">{{ getPeoples()[2].name }} {{ getPeoples()[2].surname }}</span>
                        <span class="date">({{ getPeoples()[2].birth_day }})</span>
                    </p>
                </div>
            </div>

            <!-- Якщо вибрано 2 людини -->
            <div v-else-if="getPeoples().length === 2" class="relation-block relation-marriage">
                <h4>Шлюбний зв’язок</h4>
                <div class="relation-content">
                    <p>
                        Від <span class="person">{{ getPeoples()[0].name }} {{ getPeoples()[0].surname }}</span>
                        <span class="date">({{ getPeoples()[0].birth_day }})</span>
                    </p>
                    <p>
                        до <span class="person">{{ getPeoples()[1].name }} {{ getPeoples()[1].surname }}</span>
                        <span class="date">({{ getPeoples()[1].birth_day }})</span>
                    </p>
                </div>
            </div>

            <!-- Якщо забагато -->
            <div v-else-if="getPeoples().length > 3" class="relation-message warning">
                <p>Забагато обраних людей</p>
            </div>

            <!-- Якщо замало -->
            <div v-else class="relation-message hint">
                <p>Виберіть людей, щоб створити зв’язок</p>
            </div>
        </div>
    </atom-popup>
    <core-tools
        :loading="loading"
        @add="add"
        @save="save"
        @deletePerson="deletePerson"
        @addRelations="addRelations"
    ></core-tools>
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

.relation-box {
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 16px 20px;
    font-family: "Segoe UI", sans-serif;
    color: #333;
    max-width: 480px;
    line-height: 1.5;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.relation-block {
    border-left: 4px solid #a0a0a0;
    padding-left: 12px;
}

.relation-parent {
    border-left-color: #4a90e2;
}

.relation-marriage {
    border-left-color: #d36ba4;
}

.relation-content p {
    margin: 6px 0;
}

.relation-block h4 {
    margin-bottom: 8px;
    font-size: 1.05em;
    font-weight: 600;
    color: #222;
}

.person {
    font-weight: 500;
    color: #1a5fb4;
}

.child {
    font-weight: 600;
    color: #2c8d46;
}

.date {
    color: #777;
    font-size: 0.9em;
    margin-left: 4px;
}

.relation-message {
    text-align: center;
    padding: 10px;
    font-size: 0.95em;
    border-radius: 8px;
}

.relation-message.warning {
    background: #ffe5e5;
    color: #b80000;
    border: 1px solid #f3c2c2;
}

.relation-message.hint {
    background: #f2f5f8;
    color: #555;
    border: 1px dashed #ccc;
}
</style>
