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
    const ids = Array.from(selectedIds);
    return ids.map((id) => peoples.value.find((item) => item.id === id)).filter(Boolean);
};

const submit = async (method: String, params: Object, controller = 'peoples') => {
    if (loading.value) return;
    loading.value = true;
    const response = await $fetch('api/' + controller, {
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

const relationType = ref(''); // 'marriage' або 'parent'

const addRelation = async () => {
    relationsPopup.value = false;
    await submit(
        'addRelation',
        {
            type: Array.from(selectedIds).length === 3 ? 'parent' : relationType.value,
            peoples: Array.from(selectedIds),
            treeId: tree.value.id,
        },
        'relations'
    );
};

const removeRelationsPopup = ref(false);
const removeRelations = async () => {
    removeRelationsPopup.value = false;
    await submit(
        'removeRelations',
        {
            peoples: Array.from(selectedIds),
            treeId: tree.value.id,
        },
        'relations'
    );
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

const currentPerson = computed(() => {
    return peoples.value.find((p) => p.id === Array.from(selectedIds)[0]) || null;
});

const editor = ref(false);

const editPerson = () => {
    editor.value = true;
};

function shouldDrawLine(relation) {
    if (!relation || typeof relation !== 'object') return false;

    const type = relation.type;
    if (!type) return false;

    // Брак рисуем всегда – это база для marriageCenters
    if (type === 'marriage') return true;

    if (type === 'parent') {
        const list = Array.isArray(relations?.value) ? relations.value : [];

        // Все родительские связи ЭТОГО ребёнка
        const parentRelations = list.filter((r) => r && r.type === 'parent' && r.to === relation.to);

        // 0–1 родитель – обычная вертикальная линия
        if (parentRelations.length <= 1) {
            return true;
        }

        // 2+ родителя: проверяем, есть ли между ними брак
        const parentIds = parentRelations.map((p) => p.from);

        const hasMarriage = list.some(
            (r) => r && r.type === 'marriage' && parentIds.includes(r.from) && parentIds.includes(r.to)
        );

        // Если родители состоят в браке – прямые parent→child
        // линии не нужны (дети подвяжутся от marriage/сиблингов).
        // Если брака нет – рисуем обычные связи.
        return !hasMarriage;
    }

    return false;
}

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
    <core-add-relations-popup
        v-model="relationsPopup"
        :peoples="getPeoples()"
        v-model:relationType="relationType"
        @accept="addRelation"
    ></core-add-relations-popup>

    <core-remove-relations-pupup
        v-model="removeRelationsPopup"
        :disabled="!Array.from(selectedIds).length"
        @accept="removeRelations"
    ></core-remove-relations-pupup>

    <core-tools
        :loading="loading"
        @add="add"
        @save="save"
        @deletePerson="deletePerson"
        @addRelations="addRelations"
        @removeRelations="removeRelationsPopup = true"
        @editPerson="editPerson"
    ></core-tools>

    <div class="main-container viewport">
        <div class="canvas-wrapper" :style="[cameraStyle]" @mousedown.self="selectedIds.clear()">
            <svg v-if="peoples?.length > 1" class="line-canvas" :style="{ width: '50000px', height: '50000px' }">
                <line
                    v-for="(relation, index) in relations.filter((r) => {
                        if (!r || !r.type) return false;
                        if (r.type === 'marriage') return true;
                        if (r.type === 'parent') return true;
                        return false;
                    })"
                    :key="`${relation.from}-${relation.to}`"
                    :ref="(el) => (lineRefs[index] = el)"
                    class="connector-line"
                    :data-relation-key="`${relation.from}-${relation.to}`"
                />
            </svg>
            <base-card-form
                v-if="peoplesNew.length"
                v-for="(person, index) in peoplesNew"
                :key="index"
                :model-value="person"
            ></base-card-form>
            <base-card-form
                v-if="editor === true && Array.from(selectedIds).length > 0"
                :model-value="currentPerson"
                :position="positions[Array.from(selectedIds)[0]]"
                @save="editor = false"
            ></base-card-form>
            <base-card
                v-for="person in peoples"
                :key="person.id"
                :selected="selectedIds.has(person.id)"
                :person="person"
                :position="positions[person.id]"
                :makeDraggable="makeDraggable"
                :boxRefs="boxRefs"
                :class="{ card_hidden: currentPerson?.id === person.id && editor }"
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
    transform-origin: 0 0;
    z-index: 0;
    cursor: grab;
}
.line-canvas {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1;
    overflow: visible;
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
