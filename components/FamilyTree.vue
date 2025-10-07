<script setup>
  // --- Імпорти стандартних API Vue та Nuxt/Vue Router ---
  import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
  import { useRouter } from '#app'
  import treeDataRaw from '@/data/data.json'

  // --- Приймаємо treeID як пропс (ідентифікатор потрібної гілки) ---
  const props = defineProps({ treeID: { type: String, default: "1" } })

  // --- Константи для розмітки вузлів та відступів ---
  const fixedRectW = 170           // Ширина прямокутника особи
  const rectH = 88                 // Висота прямокутника особи
  const vertGap = 140              // Вертикальний відступ між поколіннями
  const pairGap = 60               // Відстань між подружжям
  const minChildGap = 60           // Мінімальний відступ між дітьми

  // --- SVG: ширина вікна (адаптивність) та фіксована висота ---
  const svgWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 3000)
  const svgHeight = 1600           // Вистачає на велике дерево

  // --- Адаптація ширини SVG при зміні розміру вікна ---
  const updateSvgWidth = () => { svgWidth.value = window.innerWidth }
  onMounted(() => {
  svgWidth.value = window.innerWidth
  window.addEventListener('resize', updateSvgWidth)
})
  onBeforeUnmount(() => { window.removeEventListener('resize', updateSvgWidth) })

  // --- Основна гілка дерева за ID (реактивно) ---
  const mainBranch = computed(() => treeDataRaw.find(branch => branch.treeID === props.treeID))
  const familyTree = computed(() => mainBranch.value?.treeData ?? {})
  const treeTitle = computed(() => mainBranch.value?.treeBranch ?? "Родинне дерево")

  // --- Ініціалізація роутера для переходів між гілками ---
  const router = useRouter()

  // --- Дебаг: спостерігаємо за змінами treeID (можна вимкнути) ---
  watch(() => props.treeID, (val) => {
  console.log("treeID змінився, новий:", val)
})

  /**
  * Рекурсивно обробляє дочірні вузли.
  * @param {Array} children - Масив дітей.
  * @param {number} y - Y-координата для дочірнього покоління.
  * @returns {Array} - Масив результатів обробки кожного дочірнього піддерева.
  */
  function processChildren(children, y) {
  return children.map(child => {
  const childPartner = child.wife || child.husband || null
  return layoutTree(child, childPartner, 0, y + vertGap)
})
}

  /**
  * Розраховує ширину піддерев для кожного дочірнього вузла.
  * @param {Array} childResults - Результати обробки дочірніх піддерев.
  * @returns {Array} - Масив ширин піддерев.
  */
  function calculateSubtreeWidths(childResults) {
  let maxChildBlockWidth = fixedRectW
  if (childResults.length) {
  maxChildBlockWidth = Math.max(...childResults.map(res =>
  (res.selfNode ? fixedRectW : 0) + (res.partnerRectW ?? 0) + (res.hasPartner ? pairGap : 0)
  ))
  if (maxChildBlockWidth < fixedRectW) maxChildBlockWidth = fixedRectW
}

  return childResults.map(res => Math.max(maxChildBlockWidth, res.widthSubtree))
}

  /**
  * Горизонтально позиціонує дочірні піддерева.
  * @param {Array} childResults - Результати обробки.
  * @param {Array} subtreeWidths - Ширини піддерев.
  * @param {number} x - Центральна X-координата батьківського вузла.
  * @returns {void} - Модифікує childResults напряму.
  */
  function positionChildren(childResults, subtreeWidths, x) {
  if (!childResults.length) return

  const widthChildren = subtreeWidths.reduce((a, b) => a + b, 0) + (subtreeWidths.length - 1) * minChildGap
  let firstChildX;

  if (childResults.length === 1) {
  const onlyChild = childResults[0];
  if (onlyChild.hasPartner) {
  const platformWidth = fixedRectW + onlyChild.partnerRectW + pairGap + 60;
  firstChildX = x - platformWidth / 2 + fixedRectW / 2;
} else {
  firstChildX = x - fixedRectW / 2;
}
} else {
  firstChildX = x - widthChildren / 2;
}

  let curX = firstChildX
  childResults.forEach((res, i) => {
  const width = subtreeWidths[i]
  const nodeWidth = (res.selfNode ? fixedRectW : 0) + (res.partnerRectW ?? 0) + (res.hasPartner ? pairGap : 0)
  const newNodeCenterX = curX + nodeWidth / 2
  const dx = newNodeCenterX - res.selfNode.x

  // Зміщуємо всю підгілку
  res.nodes.forEach(n => n.x += dx)
  res.links.forEach(l => {
  if (l.x !== undefined) l.x += dx
  if (l.x1 !== undefined) l.x1 += dx
  if (l.x2 !== undefined) l.x2 += dx
})
  res.selfNode.x += dx
  res.minX += dx
  res.maxX += dx
  curX += width + minChildGap
})
}

  /**
  * Створює вузли для поточної пари (особа, партнер) та вузол шлюбу.
  * @param {object} person - Основна особа.
  * @param {object} partner - Партнер.
  * @param {number} x - Центральна X-координата.
  * @param {number} y - Y-координата.
  * @param {boolean} hasPartner - Чи є партнер.
  * @param {number} localPairGap - Відстань між парою.
  * @returns {Array} - Масив створених вузлів.
  */
  function createCurrentNodes(person, partner, x, y, hasPartner, localPairGap) {
  const nodes = []
  const mainPersonX = hasPartner ? x - localPairGap / 2 : x
  nodes.push({
  ...person, x: mainPersonX, y, id: person.id, isPerson: true, rectW: fixedRectW, treeRef: person.treeRef
})

  if (hasPartner) {
  nodes.push({
  ...partner, x: x + localPairGap / 2, y, id: partner.id, isPerson: true, rectW: fixedRectW, treeRef: partner.treeRef
})
  nodes.push({
  id: `${person.id}_${partner.id}_marriage`, isMarriage: true, x, y
})
}
  return nodes
}

  /**
  * Створює зв'язки (лінії) для поточної пари та їхніх дітей.
  * @param {object} person - Основна особа.
  * @param {object} partner - Партнер.
  * @param {number} x - Центральна X-координата.
  * @param {number} y - Y-координата.
  * @param {Array} childResults - Результати обробки дітей.
  * @param {boolean} hasPartner - Чи є партнер.
  * @returns {Array} - Масив створених зв'язків.
  */
  function createLinks(person, partner, x, y, childResults, hasPartner) {
  const links = []
  const yPlat = y + vertGap - vertGap / 2
  const marriageId = `${person.id}_${partner?.id}_marriage`
  const parentId = hasPartner ? marriageId : person.id
  const childNodes = childResults.map(res => res.selfNode)

  if (hasPartner) {
  links.push({ from: person.id, to: marriageId })
  links.push({ from: partner.id, to: marriageId })
}

  if (childNodes.length) {
  const onlyChild = childResults[0];
  const isSingleChildWithPartner = childNodes.length === 1 && onlyChild.hasPartner;

  if (childNodes.length > 1 || isSingleChildWithPartner) {
  // Потрібна платформа
  links.push({ from: parentId, to: null, x, y1: y, y2: yPlat, direction: "marriageToPlatform" })

  let platMinX = childNodes[0].x;
  let platMaxX = childNodes[childNodes.length - 1].x;

  if (isSingleChildWithPartner) {
  const platformWidth = fixedRectW + onlyChild.partnerRectW + pairGap + 60;
  platMinX = onlyChild.selfNode.x - (platformWidth / 2) + fixedRectW / 2;
  platMaxX = onlyChild.selfNode.x + (platformWidth / 2) - fixedRectW / 2;
}

  links.push({ from: null, to: null, x1: platMinX, x2: platMaxX, y: yPlat, direction: "platform" });
  childNodes.forEach(child => {
  links.push({ from: null, to: child.id, x: child.x, y1: yPlat, y2: child.y, direction: "platformToChild" });
});
} else if (childNodes.length === 1) {
  // Один нащадок, без платформи
  const direction = hasPartner ? "marriageToChild" : "personToChild"
  links.push({ from: parentId, to: childNodes[0].id, direction });
}
}
  return links
}

  /**
  * Основна рекурсивна функція для розрахунку позицій вузлів.
  * @param {object} person - Основна особа.
  * @param {object} partner - Партнер особи.
  * @param {number} x, y - Координати центру вузла.
  * @returns {object} - Структура з позиціями, лінками, межами піддерева.
  */
  function layoutTree(person, partner, x, y) {
  const hasPartner = partner && partner.name
  const partnerRectW = hasPartner ? fixedRectW : 0
  const localPairGap = hasPartner ? (fixedRectW / 2 + partnerRectW / 2 + pairGap) : 0

  // 1. Рекурсивно обробляємо дітей
  const children = Array.isArray(person.children) ? person.children : []
  const childResults = processChildren(children, y)

  // 2. Розраховуємо ширину піддерев і загальну ширину
  const subtreeWidths = calculateSubtreeWidths(childResults)
  const widthSelfBlock = hasPartner ? (fixedRectW + partnerRectW + localPairGap) : fixedRectW
  const widthChildren = subtreeWidths.length
  ? subtreeWidths.reduce((a, b) => a + b, 0) + (subtreeWidths.length - 1) * minChildGap
  : 0
  const widthSubtree = Math.max(widthSelfBlock, widthChildren)

  // 3. Позиціонуємо дітей
  positionChildren(childResults, subtreeWidths, x)

  // 4. Визначаємо межі піддерева (minX, maxX)
  let minX, maxX
  if (childResults.length > 0) {
  minX = Math.min(...childResults.map(r => r.minX))
  maxX = Math.max(...childResults.map(r => r.maxX))
} else {
  minX = hasPartner ? x - localPairGap / 2 - fixedRectW / 2 : x - fixedRectW / 2
  maxX = hasPartner ? x + localPairGap / 2 + partnerRectW / 2 : x + fixedRectW / 2
}

  // 5. Створюємо вузли і зв'язки для поточного рівня
  let nodes = createCurrentNodes(person, partner, x, y, hasPartner, localPairGap)
  let links = createLinks(person, partner, x, y, childResults, hasPartner)

  // 6. Збираємо всі вузли і зв'язки з дочірніх рівнів
  childResults.forEach(res => {
  nodes = nodes.concat(res.nodes)
  links = links.concat(res.links)
})

  // 7. Повертаємо фінальний об'єкт
  return {
  selfNode: {
  id: person.id,
  x: hasPartner ? x - localPairGap / 2 : x,
  y: y,
  ...person
},
  partnerRectW,
  hasPartner,
  nodes,
  links,
  minX,
  maxX,
  widthSubtree
}
}

  // --- Обчислення повного layout для дерева (reactive) ---
  const treeLayout = computed(() => {
  if (!familyTree.value.id) return { nodes: [], links: [] }
  const partner = familyTree.value.wife || familyTree.value.husband || null
  return layoutTree(familyTree.value, partner, svgWidth.value / 2, 180)
})

  // --- Всі вузли і лінки для SVG (reactive) ---
  const allNodes = computed(() => treeLayout.value.nodes)
  const allLinks = computed(() => treeLayout.value.links)

  // --- Підтримка drag/pan та zoom (ViewBox SVG) ---
  const svgRef = ref(null)
  const viewBox = ref({ x: 0, y: 0, width: svgWidth.value, height: svgHeight })
  let isPanning = false
  let startPoint = { x: 0, y: 0 }
  let startViewBox = { x: 0, y: 0, width: svgWidth.value, height: svgHeight }

  // --- Масштабування колеса миші (zoom) ---
  function onWheel(e) {
  const scale = e.deltaY < 0 ? 0.9 : 1.1
  const mx = e.offsetX
  const my = e.offsetY
  const { x, y, width: w, height: h } = viewBox.value
  const newW = w * scale
  const newH = h * scale
  const dx = ((mx / svgWidth.value) * (w - newW))
  const dy = ((my / svgHeight) * (h - newH))
  viewBox.value = {
  x: x + dx,
  y: y + dy,
  width: newW,
  height: newH
}
}
  // --- Початок переміщення (pan) ---
  function onMouseDown(e) {
  isPanning = true
  startPoint = { x: e.clientX, y: e.clientY }
  startViewBox = { ...viewBox.value }
}
  // --- Переміщення (pan) ---
  function onMouseMove(e) {
  if (!isPanning) return
  const dx = ((e.clientX - startPoint.x) * viewBox.value.width) / svgWidth.value
  const dy = ((e.clientY - startPoint.y) * viewBox.value.height) / svgHeight
  viewBox.value = {
  ...viewBox.value,
  x: startViewBox.x - dx,
  y: startViewBox.y - dy
}
}
  // --- Кінець переміщення (pan) ---
  function onMouseUp() { isPanning = false }

  // --- Перехід у гілку при натисканні на вузол з treeRef ---
  function onPersonClick(node) {
  if (node.treeRef) {
  router.push(`/branch/${node.treeRef}`)
}
}
</script>

<template>
  <v-app>
    <v-container fluid>
      <!-- Заголовок Material UI -->
      <v-row justify="center">
        <v-col cols="auto">
          <v-sheet elevation="3" class="pa-6 mb-4" rounded="xl">
            <v-typography
                variant="h2"
                align="center"
                class="font-weight-bold"
            >
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
              style="background: #fff; max-height: 85vh; overflow: hidden;"
          >
            <!-- SVG дерево (з твого коду) -->
            <svg
                ref="svgRef"
                :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`"
                :width="svgWidth"
                height="75vh"
                style="background: #fff; border-radius: 18px; box-shadow:0 3px 12px #0001; cursor:grab; user-select: none;"
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
                  <rect width="40" height="40" fill="url(#maleGrad)"/>
                  <path d="M0 28 Q 10 16, 20 28 T 40 28" stroke="#fff" stroke-width="2" fill="none" opacity="0.14"/>
                  <path d="M0 36 Q 10 28, 20 36 T 40 36" stroke="#fff" stroke-width="2" fill="none" opacity="0.08"/>
                </pattern>
                <pattern id="femalePattern" patternUnits="userSpaceOnUse" width="40" height="40">
                  <rect width="40" height="40" fill="url(#femaleGrad)"/>
                  <path d="M0 28 Q 10 16, 20 28 T 40 28" stroke="#fff" stroke-width="2" fill="none" opacity="0.13"/>
                  <path d="M0 36 Q 10 28, 20 36 T 40 36" stroke="#fff" stroke-width="2" fill="none" opacity="0.07"/>
                </pattern>
              </defs>
              <!-- Лінії (зв'язки) -->
              <g>
                <template v-for="(link, idx) in allLinks" :key="'link-'+idx">
                  <!-- Всі варіанти зв'язків, платформа, шлюб, батьки, діти -->
                  <line
                      v-if="link.direction === 'marriageToChild'"
                      :x1="allNodes.find(n=>n.id===link.from)?.x"
                      :y1="allNodes.find(n=>n.id===link.from)?.y"
                      :x2="allNodes.find(n=>n.id===link.to)?.x"
                      :y2="allNodes.find(n=>n.id===link.to)?.y"
                      stroke="#bbb" stroke-width="3" opacity="0.6"
                  />
                  <line
                      v-else-if="link.direction === 'personToChild'"
                      :x1="allNodes.find(n=>n.id===link.from)?.x"
                      :y1="allNodes.find(n=>n.id===link.from)?.y"
                      :x2="allNodes.find(n=>n.id===link.to)?.x"
                      :y2="allNodes.find(n=>n.id===link.to)?.y"
                      stroke="#bbb" stroke-width="3" opacity="0.6"
                  />
                  <line
                      v-else-if="link.direction === 'marriageToPlatform'"
                      :x1="link.x"
                      :y1="link.y1"
                      :x2="link.x"
                      :y2="link.y2"
                      stroke="#bbb" stroke-width="3" opacity="0.6"
                  />
                  <line
                      v-else-if="link.direction === 'platform' && Math.abs(link.x2 - link.x1) > 10"
                      :x1="link.x1"
                      :y1="link.y"
                      :x2="link.x2"
                      :y2="link.y"
                      stroke="#333" stroke-width="3" opacity="0.9"
                  />
                  <line
                      v-else-if="link.direction === 'platformToChild'"
                      :x1="link.x"
                      :y1="link.y1"
                      :x2="link.x"
                      :y2="link.y2"
                      stroke="#444"
                      stroke-width="3"
                      opacity="0.7"
                  />
                  <line
                      v-else
                      :x1="allNodes.find(n=>n.id===link.from)?.x"
                      :y1="allNodes.find(n=>n.id===link.from)?.y"
                      :x2="allNodes.find(n=>n.id===link.to)?.x"
                      :y2="allNodes.find(n=>n.id===link.to)?.y"
                      stroke="#ccc"
                      stroke-width="3"
                      opacity="0.7"
                  />
                </template>
              </g>
              <!-- Вузли -->
              <g>
                <template v-for="node in allNodes" :key="'node-'+node.id">
                  <!-- Прямокутник вузла (особа або партнер), з клікабельністю якщо є гілка -->
                  <rect
                      v-if="!node.isMarriage"
                      :x="node.x - fixedRectW / 2"
                      :y="node.y - rectH / 2"
                      :width="fixedRectW"
                      :height="rectH"
                      :rx="24"
                      :fill="node.gender === 'male' ? 'url(#malePattern)' : 'url(#femalePattern)'"
                      :stroke="node.treeRef ? '#009b36' : '#222'"
                      :stroke-width="node.treeRef ? 4 : 2"
                      @click="onPersonClick(node)"
                      :style="{
                      cursor: node.treeRef ? 'pointer' : 'default',
                      filter: 'drop-shadow(0 6px 32px #009b3633) blur(0.4px) saturate(1.15)',
                      opacity: 0.93,
                      transition: 'filter 0.3s, stroke 0.3s, opacity 0.3s'
                    }"
                      :onmouseover="event => event.target.style.filter='drop-shadow(0 16px 48px #009b36cc) blur(2.2px)'"
                      :onmouseleave="event => event.target.style.filter='drop-shadow(0 6px 32px #009b3633) blur(0.4px) saturate(1.15)'"
                      :title="node.treeRef ? 'Перейти у гілку' : ''"
                  />
                  <!-- Прізвище -->
                  <text
                      v-if="!node.isMarriage"
                      :x="node.x"
                      :y="node.y - 20"
                      text-anchor="middle"
                      font-size="18"
                      font-family="Inter, Arial, sans-serif"
                      font-weight="bold"
                      fill="#111"
                      style="pointer-events:none"
                  >{{ node.surname }}</text>
                  <!-- Ім'я -->
                  <text
                      v-if="!node.isMarriage"
                      :x="node.x"
                      :y="node.y"
                      text-anchor="middle"
                      font-size="17"
                      font-family="Inter, Arial, sans-serif"
                      font-weight="bold"
                      fill="#111"
                      style="pointer-events:none"
                  >{{ node.name }}</text>
                  <!-- По батькові -->
                  <text
                      v-if="!node.isMarriage"
                      :x="node.x"
                      :y="node.y + 16"
                      text-anchor="middle"
                      font-size="17"
                      font-family="Inter, Arial, sans-serif"
                      font-weight="bold"
                      fill="#111"
                      style="pointer-events:none"
                  >{{ node.patronymic }}</text>
                  <!-- Дати народження/смерті -->
                  <text
                      v-if="!node.isMarriage && node.birthDate"
                      :x="node.x"
                      :y="node.y + 32"
                      text-anchor="middle"
                      font-size="13"
                      font-family="Inter, Arial, sans-serif"
                      font-weight="bold"
                      fill="#111"
                      style="pointer-events:none"
                  >{{ node.birthDate }} {{node.deathDate }}</text>
                  <!-- Вузол шлюбу (коло) -->
                  <circle
                      v-if="node.isMarriage"
                      :cx="node.x"
                      :cy="node.y"
                      r="15"
                      fill="#fff7"
                      stroke="#ccc"
                      stroke-width="2"
                      opacity="0.8"
                      style="backdrop-filter: blur(6px);"
                  />
                </template>
              </g>
            </svg>
            <!-- Кнопка повернення -->
            <div v-if="props.treeID !== '1'" style="text-align:center; margin-top:32px; margin-bottom:16px;">
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

