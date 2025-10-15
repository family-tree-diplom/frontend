import { computed } from 'vue';

// Всі константи та функції для розрахунку переїжджають сюди
const rectW = 170;
const rectH = 88;
const vertGap = 140;
const pairGap = 60;
const minChildGap = 60;

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
    let maxChildBlockWidth = rectW
    if (childResults.length) {
        maxChildBlockWidth = Math.max(...childResults.map(res =>
            (res.selfNode ? rectW : 0) + (res.partnerRectW ?? 0) + (res.hasPartner ? pairGap : 0)
        ))
        if (maxChildBlockWidth < rectW) maxChildBlockWidth = rectW
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
            const platformWidth = rectW + onlyChild.partnerRectW + pairGap + 60;
            firstChildX = x - platformWidth / 2 + rectW / 2;
        } else {
            firstChildX = x - rectW / 2;
        }
    } else {
        firstChildX = x - widthChildren / 2;
    }

    let curX = firstChildX
    childResults.forEach((res, i) => {
        const width = subtreeWidths[i]
        const nodeWidth = (res.selfNode ? rectW : 0) + (res.partnerRectW ?? 0) + (res.hasPartner ? pairGap : 0)
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
        ...person, x: mainPersonX, y, id: person.id, isPerson: true, rectW: rectW, treeRef: person.treeRef
    })

    if (hasPartner) {
        nodes.push({
            ...partner, x: x + localPairGap / 2, y, id: partner.id, isPerson: true, rectW: rectW, treeRef: partner.treeRef
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
                const platformWidth = rectW + onlyChild.partnerRectW + pairGap + 60;
                platMinX = onlyChild.selfNode.x - (platformWidth / 2) + rectW / 2;
                platMaxX = onlyChild.selfNode.x + (platformWidth / 2) - rectW / 2;
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
    const partnerRectW = hasPartner ? rectW : 0
    const localPairGap = hasPartner ? (rectW / 2 + partnerRectW / 2 + pairGap) : 0

    // 1. Рекурсивно обробляємо дітей
    const children = Array.isArray(person.children) ? person.children : []
    const childResults = processChildren(children, y)

    // 2. Розраховуємо ширину піддерев і загальну ширину
    const subtreeWidths = calculateSubtreeWidths(childResults)
    const widthSelfBlock = hasPartner ? (rectW + partnerRectW + localPairGap) : rectW
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
        minX = hasPartner ? x - localPairGap / 2 - rectW / 2 : x - rectW / 2
        maxX = hasPartner ? x + localPairGap / 2 + partnerRectW / 2 : x + rectW / 2
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

// --- Головна функція, яку ми експортуємо ---

export function useFamilyTreeLayout(familyTree, svgWidth) {

    const treeLayout = computed(() => {
        if (!familyTree.value?.id) return { nodes: [], links: [] };
        const partner = familyTree.value.wife || familyTree.value.husband || null;
        return layoutTree(familyTree.value, partner, svgWidth.value / 2, 180);
    });

    const allNodes = computed(() => treeLayout.value.nodes);
    const allLinks = computed(() => treeLayout.value.links);

    return {
        allNodes,
        allLinks,
    };
}
