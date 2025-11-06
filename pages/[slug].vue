<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable } from '~/composables/useDraggable';
import { useFamilyLines } from '~/composables/useFamilyLines';
import { useCamera } from '~/composables/useCamera';
import { process } from 'std-env';

const config = useRuntimeConfig();
const route = useRoute();

const relationType = ref(''); // 'marriage' або 'parent'

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
    <atom-popup v-model="relationsPopup">
        <div class="relation-box">
            <!-- Якщо вибрано 3 людей -->
            <div v-if="getPeoples().length === 3" class="relation-block relation-parent">
                <h4>Зв’язок між батьками і дитиною</h4>
                <div class="relation-content">
                    <p>
                        Від <span class="person">{{ getPeoples()[0].surname }} {{ getPeoples()[0].name }}</span>
                        <span class="date">({{ getPeoples()[0].birth_day }})</span>
                    </p>
                    <p>
                        і <span class="person">{{ getPeoples()[1].surname }} {{ getPeoples()[1].name }}</span>
                        <span class="date">({{ getPeoples()[1].birth_day }})</span>
                    </p>
                    <p>
                        прокласти батьківський зв’язок до
                        <span class="child">{{ getPeoples()[2].surname }} {{ getPeoples()[2].name }}</span>
                        <span class="date">({{ getPeoples()[2].birth_day }})</span>
                    </p>
                </div>

                <div class="btn-group">
                    <button class="btn accept" @click="acceptRelation('parent')">Прийняти</button>
                    <button class="btn reject" @click="rejectRelation">Відхилити</button>
                </div>
            </div>

            <!-- Якщо вибрано 2 людини -->
            <div v-else-if="getPeoples().length === 2" class="relation-block relation-two">
                <h4>Виберіть тип зв’язку</h4>

                <div class="relation-selector">
                    <label>
                        <input
                            type="radio"
                            value="marriage"
                            v-model="relationType"
                        />
                        Шлюбний зв’язок
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="parent"
                            v-model="relationType"
                        />
                        Батьківський зв’язок
                    </label>
                </div>

                <div v-if="relationType === 'marriage'" class="relation-content relation-marriage">
                    <p>
                        Від <span class="person">{{ getPeoples()[0].surname }} {{ getPeoples()[0].name }}</span>
                        <span class="date">({{ getPeoples()[0].birth_day }})</span>
                    </p>
                    <p>
                        до <span class="person">{{ getPeoples()[1].surname }} {{ getPeoples()[1].name }}</span>
                        <span class="date">({{ getPeoples()[1].birth_day }})</span>
                    </p>
                    <p>Створити шлюбний зв’язок між цими особами.</p>
                </div>

                <div v-else-if="relationType === 'parent'" class="relation-content relation-parent">
                    <p>
                        Від <span class="person">{{ getPeoples()[0].surname }} {{ getPeoples()[0].name }}</span>
                        <span class="date">({{ getPeoples()[0].birth_day }})</span>
                    </p>
                    <p>
                        до <span class="child">{{ getPeoples()[1].surname }} {{ getPeoples()[1].name }}</span>
                        <span class="date">({{ getPeoples()[1].birth_day }})</span>
                    </p>
                    <p>Створити батьківський зв’язок між цими особами.</p>
                </div>

                <div class="btn-group">
                    <button
                        class="btn accept"
                        :disabled="!relationType"
                        @click="acceptRelation(relationType)"
                    >
                        Прийняти
                    </button>
                    <button class="btn reject" @click="rejectRelation">Відхилити</button>
                </div>
            </div>

            <!-- Якщо забагато -->
            <div v-else-if="getPeoples().length > 3" class="relation-message warning">
                <p>Забагато обраних людей</p>
                <div class="btn-group">
                    <button class="btn reject" @click="rejectRelation">Відхилити</button>
                </div>
            </div>

            <!-- Якщо замало -->
            <div v-else class="relation-message hint">
                <p>Виберіть людей, щоб створити зв’язок</p>
                <div class="btn-group">
                    <button class="btn reject" @click="rejectRelation">Відхилити</button>
                </div>
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
            <base-card-add
                v-if="peoplesNew.length"
                v-for="(person, index) in peoplesNew"
                :key="index"
                :model-value="person"
            ></base-card-add>
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
    max-width: 520px;
    line-height: 1.5;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.relation-block {
    border-left: 4px solid #a0a0a0;
    padding-left: 12px;
    margin-bottom: 8px;
}

.relation-parent {
    border-left-color: #4a90e2;
}

.relation-marriage {
    border-left-color: #d36ba4;
}

.relation-two h4 {
    margin-bottom: 10px;
}

.relation-selector {
    display: flex;
    gap: 20px;
    margin-bottom: 10px;
}

.relation-selector label {
    font-size: 0.95em;
    cursor: pointer;
    user-select: none;
}

.relation-selector input[type="radio"] {
    margin-right: 6px;
}

.relation-content p {
    margin: 5px 0;
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

/* --- Кнопки --- */
.btn-group {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 14px;
}

.btn {
    padding: 6px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9em;
    transition: background 0.2s ease;
}

.btn.accept {
    background: #2b8a3e;
    color: #fff;
}

.btn.accept:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.btn.accept:hover:not(:disabled) {
    background: #237734;
}

.btn.reject {
    background: #d9534f;
    color: #fff;
}

.btn.reject:hover {
    background: #c9302c;
}
</style>
