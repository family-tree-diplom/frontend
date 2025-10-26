// composables/useFamilyLines.ts
export function useFamilyLines(boxRefs, lineRefs, circleRefs, relations) {
    const marriageCenters = ref<Record<string, { x: number; y: number }>>({});

    function makePairKey(a: number, b: number): string {
        return [a, b].sort((x, y) => x - y).join('-');
    }

    function findParentsOf(childId: number) {
        const parents = relations.value
            .filter((r) => r.type === 'parent' && r.to === childId)
            .map((r) => r.from);
        if (parents.length === 2) {
            const [p1, p2] = parents.sort((a, b) => a - b);
            return { parentA: p1, parentB: p2 };
        }
        return null;
    }

    function clearDynamicLines() {
        document.querySelectorAll('.sibling-line, .sibling-child-line, .sibling-connector')
            .forEach((el) => el.remove());
    }

    function getLineByKey(from: number, to: number): SVGLineElement | undefined {
        const key = `${from}-${to}`;
        return lineRefs.value.find((l: SVGLineElement) => l?.dataset?.relationKey === key);
    }

    // === Утиліта для обчислення абсолютних координат центру <g> ===
    function getCenter(el: SVGGElement) {
        const bbox = el.getBBox();
        const transform = el.getAttribute('transform');
        let tx = 0, ty = 0;
        const match = transform?.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        if (match) {
            tx = parseFloat(match[1]);
            ty = parseFloat(match[2]);
        }
        return {
            x: tx + bbox.x + bbox.width / 2,
            y: ty + bbox.y + bbox.height / 2,
            top: ty + bbox.y,
            bottom: ty + bbox.y + bbox.height,
        };
    }

    /* =================== ШЛЮБ =================== */
    function drawMarriageLines() {
        marriageCenters.value = {};
        relations.value
            .filter((r) => r.type === 'marriage')
            .forEach((rel) => {
                const el1 = boxRefs.value[rel.from];
                const el2 = boxRefs.value[rel.to];
                const line = getLineByKey(rel.from, rel.to);
                if (!el1 || !el2 || !line) return;

                const p1 = getCenter(el1);
                const p2 = getCenter(el2);

                line.setAttribute('x1', String(p1.x));
                line.setAttribute('y1', String(p1.y));
                line.setAttribute('x2', String(p2.x));
                line.setAttribute('y2', String(p2.y));
                line.style.display = 'block';

                const cx = (p1.x + p2.x) / 2;
                const cy = (p1.y + p2.y) / 2;

                const key = makePairKey(rel.from, rel.to);
                const circle = circleRefs.value[key];
                if (circle) {
                    circle.setAttribute('cx', String(cx));
                    circle.setAttribute('cy', String(cy));
                }
                marriageCenters.value[key] = { x: cx, y: cy };
            });
    }

    /* =================== БАТЬКИ =================== */
    function drawParentLines() {
        relations.value
            .filter((r) => r.type === 'parent')
            .forEach((rel) => {
                const el1 = boxRefs.value[rel.from];
                const el2 = boxRefs.value[rel.to];
                const line = getLineByKey(rel.from, rel.to);
                if (!el1 || !el2 || !line) return;

                const parents = findParentsOf(rel.to);
                if (parents) {
                    line.style.display = 'none';
                    return;
                }

                const p1 = getCenter(el1);
                const p2 = getCenter(el2);

                line.setAttribute('x1', String(p1.x));
                line.setAttribute('y1', String(p1.bottom));
                line.setAttribute('x2', String(p2.x));
                line.setAttribute('y2', String(p2.top));
                line.style.display = 'block';
            });
    }

    /* =================== ДІТИ / БРАТИ / СЕСТРИ =================== */
    function drawSiblingLines() {
        const siblingGroups: Record<string, number[]> = {};

        relations.value
            .filter((r) => r.type === 'parent')
            .forEach((r) => {
                const parents = findParentsOf(r.to);
                if (parents) {
                    const key = makePairKey(parents.parentA, parents.parentB);
                    if (!siblingGroups[key]) siblingGroups[key] = [];
                    if (!siblingGroups[key].includes(r.to)) siblingGroups[key].push(r.to);
                }
            });

        Object.entries(siblingGroups).forEach(([key, children]) => {
            const els = children.map((id) => boxRefs.value[id]).filter(Boolean);
            if (!els.length) return;

            const centers = els.map((el) => getCenter(el));
            const first = centers[0];
            const last = centers[centers.length - 1];

            const x1 = first.x;
            const x2 = last.x;
            const centerX = (x1 + x2) / 2;
            const yAxis = Math.min(...centers.map((c) => c.top)) - 40;

            const marriage = marriageCenters.value[key];
            if (marriage) {
                const vertLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                vertLine.classList.add('connector-line', 'sibling-connector');
                vertLine.setAttribute('x1', String(marriage.x));
                vertLine.setAttribute('y1', String(marriage.y));
                vertLine.setAttribute('x2', String(centerX));
                vertLine.setAttribute('y2', String(yAxis));
                document.querySelector('.line-canvas')?.appendChild(vertLine);
            }

            const siblingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            siblingLine.classList.add('connector-line', 'sibling-line');
            siblingLine.setAttribute('x1', String(x1));
            siblingLine.setAttribute('y1', String(yAxis));
            siblingLine.setAttribute('x2', String(x2));
            siblingLine.setAttribute('y2', String(yAxis));
            document.querySelector('.line-canvas')?.appendChild(siblingLine);

            centers.forEach((c) => {
                const childLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                childLine.classList.add('connector-line', 'sibling-child-line');
                childLine.setAttribute('x1', String(c.x));
                childLine.setAttribute('y1', String(yAxis));
                childLine.setAttribute('x2', String(c.x));
                childLine.setAttribute('y2', String(c.top));
                document.querySelector('.line-canvas')?.appendChild(childLine);
            });
        });
    }

    function updateAllLines() {
        clearDynamicLines();
        drawMarriageLines();
        drawParentLines();
        drawSiblingLines();
    }

    return { updateAllLines, marriageCenters, makePairKey };
}
