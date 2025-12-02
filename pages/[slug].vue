<script setup lang="ts">
import { useFamilyData } from '~/composables/useFamilyData';
import { useDraggable, type DraggableKey } from '~/composables/useDraggable';
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
const peoplesNew = ref<any[]>([]);
let tempIdCounter = 0;

const siblingGroups = computed(() => {
    const parentsByChild: Record<number, number[]> = {};
    const groupsByParents: Record<string, { parents: number[]; children: number[] }> = {};
    const singleParentGroups: Record<number, { parent: number; children: number[] }> = {};

    relations.value
        .filter((r) => r.type === 'parent')
        .forEach((r) => {
            if (!parentsByChild[r.to]) {
                parentsByChild[r.to] = [];
            }
            if (!parentsByChild[r.to].includes(r.from)) {
                parentsByChild[r.to].push(r.from);
            }
        });

    Object.entries(parentsByChild).forEach(([childIdStr, parents]) => {
        const childId = Number(childIdStr);

        if (parents.length >= 2) {
            const sorted = (parents as number[]).sort((a, b) => a - b);
            const key = `${sorted[0]}-${sorted[1]}`;

            if (!groupsByParents[key]) {
                groupsByParents[key] = {
                    parents: sorted,
                    children: [],
                };
            }

            groupsByParents[key].children.push(childId);
        } else if (parents.length === 1) {
            const parentId = parents[0];

            if (!singleParentGroups[parentId]) {
                singleParentGroups[parentId] = {
                    parent: parentId,
                    children: [],
                };
            }
            singleParentGroups[parentId].children.push(childId);
        }
    });

    const combinedGroups: Array<{ parents: number[]; children: number[] }> = [];
    combinedGroups.push(...Object.values(groupsByParents));

    Object.values(singleParentGroups).forEach((group) => {
        combinedGroups.push({
            parents: [group.parent],
            children: group.children,
        });
    });

    return combinedGroups;
});

const boxRefs = ref([]); // посилання на div-блоки
const lineRefs = ref([]); // посилання на svg-лінії
const circleRefs = ref<Record<string, SVGCircleElement>>({});

const loading = ref(false);

const add = () => {
    const tempId = `temp-${tempIdCounter++}`;

    const person = {
        id: tempId,
        name: '',
        surname: '',
        birth_day: '',
        death: '',
        gender: 'unknown',
        _isNew: true,
    };

    peoplesNew.value.push(person);

    const center = cameraCenter.value;
    if (!positions[tempId]) {
        positions[tempId] = { x: center.x, y: center.y };
    }
};

const save = async () => {
    if (!peoplesNew.value.length) return;

    const beforeIds = new Set(peoples.value.map((p) => p.id));

    const tempPositions = peoplesNew.value.map((p) => ({
        tempId: p.id as DraggableKey,
        position: positions[p.id as DraggableKey] ? { ...positions[p.id as DraggableKey] } : null,
    }));

    const peoplesForSend = peoplesNew.value.map(({ id, _isNew, ...rest }) => rest);

    await submit('save', {
        peoples: peoplesForSend,
        treeId: tree.value.id,
    });

    const createdPeoples = peoples.value.filter((p) => !beforeIds.has(p.id));

    createdPeoples.forEach((person, index) => {
        const mapping = tempPositions[index];
        if (!mapping) return;

        const { tempId, position } = mapping;

        if (position) {
            positions[person.id as DraggableKey] = { ...position };
        }

        if (tempId in positions) {
            delete positions[tempId];
        }
    });

    updateAllLines();
    savePositions();
};

const selectedIds = reactive(new Set<DraggableKey>());

const getNumericSelectedIds = () => Array.from(selectedIds).filter((id): id is number => typeof id === 'number');

const deletePerson = async () => {
    const ids = getNumericSelectedIds();
    if (!ids.length) return;

    await submit('deletePerson', {
        selectedIds: ids,
        treeId: tree.value.id,
    });
};

const relationsPopup = ref(false);

const addRelations = () => {
    relationsPopup.value = true;
};

const getPeoples = () => {
    const ids = getNumericSelectedIds();
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
    const ids = getNumericSelectedIds();
    if (!ids.length) return;

    relationsPopup.value = false;
    await submit(
        'addRelation',
        {
            type: ids.length === 3 ? 'parent' : relationType.value,
            peoples: ids,
            treeId: tree.value.id,
        },
        'relations'
    );
};

const removeRelationsPopup = ref(false);
const removeRelations = async () => {
    const ids = getNumericSelectedIds();
    if (!ids.length) return;

    removeRelationsPopup.value = false;
    await submit(
        'removeRelations',
        {
            peoples: ids,
            treeId: tree.value.id,
        },
        'relations'
    );
};

interface Position {
    x: number;
    y: number;
}

const positions = reactive<Record<DraggableKey, Position>>({} as any);

const STORAGE_KEY = computed(() => `family_positions_${route.params.slug}`);

const { camera, cameraStyle, cameraCenter } = useCamera();
const { updateAllLines } = useFamilyLines(boxRefs, lineRefs, circleRefs, relations, positions);

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

const alignSiblings = () => {
    const rowGap = 225;
    const siblingGap = 500;
    const parentGap = 1000;

    siblingGroups.value.forEach((group, row) => {
        const parents = group.parents;
        const childrens = group.children;

        if (row === 0) {
            childrens.forEach((children, index) => {
                if (index === 0) {
                    positions[children] = { x: 0, y: 0 };
                    return;
                }
                if (!positions[children]) positions[children] = { x: 0, y: 0 };
                positions[children] = { x: index * siblingGap, y: positions[childrens[0]].y };
            });
            parents.forEach((parent, index) => {
                const x = ((childrens.length - 1) * siblingGap) / 2;
                if (index === 0) {
                    positions[parent] = { x: x - parentGap, y: -rowGap };
                } else {
                    positions[parent] = { x: x + parentGap, y: -rowGap };
                }
            });
        } else {
            parents.forEach((parent, index) => {
                const x = positions[childrens[0]].x;
                if (index === 0) {
                    positions[parent] = {
                        x: x - parentGap / (positions[childrens[0]].y / -rowGap) / 2,
                        y: -rowGap + positions[childrens[0]].y,
                    };
                } else {
                    positions[parent] = {
                        x: x + parentGap / (positions[childrens[0]].y / -rowGap) / 2,
                        y: -rowGap + positions[childrens[0]].y,
                    };
                }
            });
        }
    });
    updateAllLines();
};

// --- Ініціалізація позицій після повного завантаження дерева
async function initPositions() {
    await nextTick();
    const saved = loadPositions();

    peoples.value.forEach((p, index) => {
        const key: DraggableKey = p.id;

        if (saved[key]) {
            positions[key] = { x: saved[key].x, y: saved[key].y };
        } else if (!positions[key]) {
            positions[key] = { x: 150 + index * 100, y: 100 + index * 80 };
        }
    });

    nextTick(initDragAndLines);
}

function toggleSelect(id: DraggableKey, multi = false) {
    if (!multi) selectedIds.clear();
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
}

const { makeDraggable } = useDraggable(
    () => {
        updateAllLines();
        savePositions();
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
    const firstSelected = getNumericSelectedIds()[0];
    if (!firstSelected) return null;
    return peoples.value.find((p) => p.id === firstSelected) || null;
});

const editor = ref(false);

const editPerson = () => {
    editor.value = true;
};

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
    title: 'Дерево ' + tree.value.title,
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
        :disabled="!getNumericSelectedIds().length"
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
        @alignSiblings="alignSiblings"
    ></core-tools>

    <div class="main-container viewport" @mousedown.self="selectedIds.clear()">
        <div class="canvas-wrapper" :style="[cameraStyle]">
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
                v-for="(person, index) in peoplesNew"
                v-if="peoplesNew.length"
                :key="person.id ?? index"
                :model-value="person"
                :person-id="person.id"
                :position="positions[person.id]"
                :make-draggable="makeDraggable"
                :box-refs="boxRefs"
                @save="save"
            />
            <base-card-form
                v-if="editor === true && getNumericSelectedIds().length > 0"
                :model-value="currentPerson"
                :person-id="currentPerson?.id"
                :position="positions[getNumericSelectedIds()[0]]"
                :make-draggable="makeDraggable"
                :box-refs="boxRefs"
                @save="editor = false"
            />
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
