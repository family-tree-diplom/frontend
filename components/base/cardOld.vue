<script setup lang="ts">
import { useRouter } from '#app';

const router = useRouter();

const props = defineProps({
    people: {
        type: Object,
        required: true,
    },
    width: {
        type: Number,
        default() {
            return 170;
        },
    },
    height: {
        type: Number,
        default() {
            return 88;
        },
    },
});

// --- Перехід у гілку при натисканні на вузол з treeRef ---
function onPersonClick(item) {
    if (item.treeRef) {
        router.push(`/branch/${item.treeRef}`);
    }
}
console.log(props.people)
</script>

<template>

    <!-- Прямокутник вузла (особа або партнер), з клікабельністю якщо є гілка -->
    <rect
        v-if="!people?.isMarriage"
        :x="people.x - width / 2"
        :y="people.y - height / 2"
        :width="width"
        :height="height"
        :rx="24"
        :fill="people.gender === 'male' ? 'url(#malePattern)' : 'url(#femalePattern)'"
        :stroke="people.treeRef ? '#009b36' : '#222'"
        :stroke-width="people.treeRef ? 4 : 2"
        @click="onPersonClick(people)"
        :style="{
            cursor: people.treeRef ? 'pointer' : 'default',
            filter: 'drop-shadow(0 6px 32px #009b3633) blur(0.4px) saturate(1.15)',
            opacity: 0.93,
            transition: 'filter 0.3s, stroke 0.3s, opacity 0.3s',
        }"
        :onmouseover="(event) => (event.target.style.filter = 'drop-shadow(0 16px 48px #009b36cc) blur(2.2px)')"
        :onmouseleave="
            (event) => (event.target.style.filter = 'drop-shadow(0 6px 32px #009b3633) blur(0.4px) saturate(1.15)')
        "
        :title="people.treeRef ? 'Перейти у гілку' : ''"
    />
    <!-- Прізвище -->
    <text
        v-if="!people?.isMarriage"
        :x="people.x"
        :y="people.y - 20"
        text-anchor="middle"
        font-size="18"
        font-family="Inter, Arial, sans-serif"
        font-weight="bold"
        fill="#111"
        style="pointer-events: none"
    >
        {{ people.surname }}
    </text>
    <!-- Ім'я -->
    <text
        v-if="!people?.isMarriage"
        :x="people.x"
        :y="people.y"
        text-anchor="middle"
        font-size="17"
        font-family="Inter, Arial, sans-serif"
        font-weight="bold"
        fill="#111"
        style="pointer-events: none"
    >
        {{ people.name }}
    </text>
    <!-- По батькові -->
    <text
        v-if="!people?.isMarriage"
        :x="people.x"
        :y="people.y + 16"
        text-anchor="middle"
        font-size="17"
        font-family="Inter, Arial, sans-serif"
        font-weight="bold"
        fill="#111"
        style="pointer-events: none"
    >
        {{ people.patronymic }}
    </text>
    <!-- Дати народження/смерті -->
    <text
        v-if="!people?.isMarriage && people.birthDate"
        :x="people.x"
        :y="people.y + 32"
        text-anchor="middle"
        font-size="13"
        font-family="Inter, Arial, sans-serif"
        font-weight="bold"
        fill="#111"
        style="pointer-events: none"
    >
        {{ people.birthDate }} {{ people.deathDate }}
    </text>
    <!-- Вузол шлюбу (коло) -->
    <circle
        v-if="people?.isMarriage"
        :cx="people.x"
        :cy="people.y"
        r="15"
        fill="#fff7"
        stroke="#ccc"
        stroke-width="2"
        opacity="0.8"
        style="backdrop-filter: blur(6px)"
    />
</template>

<style scoped lang="scss"></style>
