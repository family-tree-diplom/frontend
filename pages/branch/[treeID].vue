<script setup>
import { useRoute } from '#app'
import FamilyTree from '~/components/FamilyTree.vue'

const route = useRoute()
const treeID = computed(() => route.params.treeID || "1")
</script>

<template>
  <FamilyTree :treeID="treeID" :key="treeID" />
</template>
