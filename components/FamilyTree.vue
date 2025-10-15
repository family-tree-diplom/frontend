<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from '#app';
import treeDataRaw from '@/data/data.json';
// Наша винесена логіка розрахунків
import { useFamilyTreeLayout } from '~/composables/useFamilyTreeLayout';

const config = useRuntimeConfig();

const props = defineProps({ treeID: { type: String, default: "1" } });
const router = useRouter();

// --- БЛОК ДАНИХ ---
const mainBranch = computed(() => treeDataRaw.find(branch => branch.treeID === props.treeID));
const familyTree = computed(() => mainBranch.value?.treeData ?? {});
const treeTitle = computed(() => mainBranch.value?.treeBranch ?? "Родинне дерево");
const svgWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 3000);

// --- ВИКЛИК КОМПОЗАБЛА ---
// Передаємо дані та отримуємо готові масиви вузлів та зв'язків
const { allNodes, allLinks } = useFamilyTreeLayout(familyTree, svgWidth);

const peoples = await useAsyncData(
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

// --- БЛОК ІНТЕРАКТИВНОСТІ (Pan & Zoom) ---
const svgHeight = 1600;
const svgRef = ref(null);
const viewBox = ref({ x: 0, y: 0, width: svgWidth.value, height: svgHeight });
let isPanning = false;
let startPoint = { x: 0, y: 0 };
let startViewBox = { x: 0, y: 0, width: svgWidth.value, height: svgHeight };

const updateSvgWidth = () => { svgWidth.value = window.innerWidth; };
onMounted(() => {
    svgWidth.value = window.innerWidth;
    window.addEventListener('resize', updateSvgWidth);
});
onBeforeUnmount(() => { window.removeEventListener('resize', updateSvgWidth); });

function onWheel(e) {
    const scale = e.deltaY < 0 ? 0.9 : 1.1;
    const mx = e.offsetX;
    const my = e.offsetY;
    const { x, y, width: w, height: h } = viewBox.value;
    const newW = w * scale;
    const newH = h * scale;
    const dx = ((mx / svgWidth.value) * (w - newW));
    const dy = ((my / svgHeight) * (h - newH));
    viewBox.value = {
        x: x + dx,
        y: y + dy,
        width: newW,
        height: newH,
    };
}

function onMouseDown(e) {
    isPanning = true;
    startPoint = { x: e.clientX, y: e.clientY };
    startViewBox = { ...viewBox.value };
}

function onMouseMove(e) {
    if (!isPanning) return;
    const dx = ((e.clientX - startPoint.x) * viewBox.value.width) / svgWidth.value;
    const dy = ((e.clientY - startPoint.y) * viewBox.value.height) / svgHeight;
    viewBox.value = {
        ...viewBox.value,
        x: startViewBox.x - dx,
        y: startViewBox.y - dy,
    };
}

function onMouseUp() {
    isPanning = false;
}
</script>

<template>
    <v-app>
        <v-container fluid>
            <pre>{{ peoples }}</pre>
            <!-- Заголовок Material UI -->
            <v-row justify="center">
                <v-col cols="auto">
                    <v-sheet elevation="3" class="pa-6 mb-4" rounded="xl">
                        <v-typography variant="h2" align="center" class="font-weight-bold">
                            {{ treeTitle }}
                        </v-typography>
                    </v-sheet>
                </v-col>
            </v-row>
            <!-- Карта для SVG дерева -->
            <v-row justify="center">
                <v-col cols="12">
                    <v-card
                        elevation="8"
                        class="pa-2 mb-4"
                        rounded="2xl"
                        style="background: #fff; max-height: 85vh; overflow: hidden"
                    >
                        <!-- SVG дерево (з твого коду) -->
                        <svg
                            ref="svgRef"
                            :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`"
                            :width="svgWidth"
                            height="75vh"
                            style="
                                background: #fff;
                                border-radius: 18px;
                                box-shadow: 0 3px 12px #0001;
                                cursor: grab;
                                user-select: none;
                            "
                            @mousedown="onMouseDown"
                            @mousemove="onMouseMove"
                            @mouseup="onMouseUp"
                            @mouseleave="onMouseUp"
                            @wheel.prevent="onWheel"
                        >
                            <defs>
                                <!-- Градієнти та патерни для вузлів -->
                                <linearGradient id="maleGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stop-color="#3ddcff" />
                                    <stop offset="100%" stop-color="#2572d3" />
                                </linearGradient>
                                <linearGradient id="femaleGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stop-color="#ffadc2" />
                                    <stop offset="100%" stop-color="#e864a7" />
                                </linearGradient>
                                <pattern id="malePattern" patternUnits="userSpaceOnUse" width="40" height="40">
                                    <rect width="40" height="40" fill="url(#maleGrad)" />
                                    <path
                                        d="M0 28 Q 10 16, 20 28 T 40 28"
                                        stroke="#fff"
                                        stroke-width="2"
                                        fill="none"
                                        opacity="0.14"
                                    />
                                    <path
                                        d="M0 36 Q 10 28, 20 36 T 40 36"
                                        stroke="#fff"
                                        stroke-width="2"
                                        fill="none"
                                        opacity="0.08"
                                    />
                                </pattern>
                                <pattern id="femalePattern" patternUnits="userSpaceOnUse" width="40" height="40">
                                    <rect width="40" height="40" fill="url(#femaleGrad)" />
                                    <path
                                        d="M0 28 Q 10 16, 20 28 T 40 28"
                                        stroke="#fff"
                                        stroke-width="2"
                                        fill="none"
                                        opacity="0.13"
                                    />
                                    <path
                                        d="M0 36 Q 10 28, 20 36 T 40 36"
                                        stroke="#fff"
                                        stroke-width="2"
                                        fill="none"
                                        opacity="0.07"
                                    />
                                </pattern>
                            </defs>
                            <!-- Лінії (зв'язки) -->
                            <g>
                                <base-line
                                    v-for="(link, idx) in allLinks"
                                    :key="'link-' + idx"
                                    :relations="link"
                                    :peoples="allNodes"
                                ></base-line>
                            </g>
                            <!-- Вузли -->
                            <g>
                                <base-card
                                    v-for="node in allNodes"
                                    :key="'node-' + node.id"
                                    :people="node"
                                    :width="rectW"
                                    :height="rectH"
                                ></base-card>
                            </g>
                        </svg>
                        <!-- Кнопка повернення -->
                        <div
                            v-if="props.treeID !== '1'"
                            style="text-align: center; margin-top: 32px; margin-bottom: 16px"
                        >
                            <v-btn
                                color="primary"
                                prepend-icon="mdi-arrow-left"
                                elevation="4"
                                class="text-h6"
                                rounded="xl"
                                @click="router.push('/tree')"
                            >
                                Повернутись до основної гілки
                            </v-btn>
                        </div>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </v-app>
</template>
