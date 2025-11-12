/**
 * Малює всі зв’язки між людьми, використовуючи positions (world-space)
 */
export function useFamilyLines(boxRefs, lineRefs, circleRefs, relations, positions) {
    const marriageCenters = ref<Record<string, { x: number; y: number }>>({});

    function makePairKey(a: number, b: number): string {
        return [a, b].sort((x, y) => x - y).join('-');
    }

    function findParentsOf(childId: number) {
        const parents = relations.value.filter((r) => r.type === 'parent' && r.to === childId).map((r) => r.from);
        if (parents.length === 2) {
            const [parentA, parentB] = parents.sort((a, b) => a - b);
            return { parentA, parentB };
        }
        return null;
    }

    function clearDynamicLines() {
        document
            .querySelectorAll('.sibling-line, .sibling-child-line, .sibling-connector')
            .forEach((el) => el.remove());
    }

    function getLineByKey(from: number, to: number): SVGLineElement | undefined {
        const key = `${from}-${to}`;
        return lineRefs.value.find((l: SVGLineElement) => l?.dataset?.relationKey === key) as
            | SVGLineElement
            | undefined;
    }

    /* =================== Шлюбні лінії =================== */
    function drawMarriageLines() {
        marriageCenters.value = {};

        document.querySelectorAll('.connector-circle').forEach((el) => el.remove());

        relations.value
            .filter((r) => r.type === 'marriage')
            .forEach((rel) => {
                const el1 = boxRefs.value[rel.from];
                const el2 = boxRefs.value[rel.to];
                const pos1 = positions[rel.from];
                const pos2 = positions[rel.to];

                if (!el1 || !el2 || !pos1 || !pos2) return;

                const x1 = pos1.x + el1.offsetWidth / 2;
                const y1 = pos1.y + el1.offsetHeight / 2;
                const x2 = pos2.x + el2.offsetWidth / 2;
                const y2 = pos2.y + el2.offsetHeight / 2;

                const line = getLineByKey(rel.from, rel.to);
                if (!line) return;

                line.setAttribute('x1', String(x1));
                line.setAttribute('y1', String(y1));
                line.setAttribute('x2', String(x2));
                line.setAttribute('y2', String(y2));
                line.style.display = 'block';

                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;

                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.classList.add('connector-circle');
                circle.setAttribute('cx', String(cx));
                circle.setAttribute('cy', String(cy));
                circle.setAttribute('r', '6');
                document.querySelector('.line-canvas')?.appendChild(circle);

                const key = makePairKey(rel.from, rel.to);
                marriageCenters.value[key] = { x: cx, y: cy };
            });
    }

    /* =================== Батьківські лінії =================== */
    function drawParentLines() {
        relations.value
            .filter((r) => r.type === 'parent')
            .forEach((rel) => {
                const el1 = boxRefs.value[rel.from];
                const el2 = boxRefs.value[rel.to];
                const line = getLineByKey(rel.from, rel.to);
                if (!el1 || !el2 || !line) return;

                const pos1 = positions[rel.from];
                const pos2 = positions[rel.to];
                if (!pos1 || !pos2) return;

                const parents = findParentsOf(rel.to);
                if (parents) {
                    line.style.display = 'none';
                    return;
                }

                const x1 = pos1.x + el1.offsetWidth / 2;
                const y1 = pos1.y + el1.offsetHeight;
                const x2 = pos2.x + el2.offsetWidth / 2;
                const y2 = pos2.y;

                line.setAttribute('x1', String(x1));
                line.setAttribute('y1', String(y1));
                line.setAttribute('x2', String(x2));
                line.setAttribute('y2', String(y2));
                line.style.display = 'block';
            });
    }

    /* =================== Брати/сестри =================== */
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

            const first = els[0];
            const last = els[els.length - 1];

            const posFirst = positions[children[0]];
            const posLast = positions[children[children.length - 1]];
            if (!posFirst || !posLast) return;

            const x1 = posFirst.x + first.offsetWidth / 2;
            const x2 = posLast.x + last.offsetWidth / 2;
            const centerX = (x1 + x2) / 2;

            const minY = Math.min(...children.map((id) => positions[id]?.y ?? 0));
            const yAxis = minY - 40;

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

            els.forEach((el, i) => {
                const pos = positions[children[i]];
                const childX = pos.x + el.offsetWidth / 2;
                const childY = pos.y;
                const childLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                childLine.classList.add('connector-line', 'sibling-child-line');
                childLine.setAttribute('x1', String(childX));
                childLine.setAttribute('y1', String(yAxis));
                childLine.setAttribute('x2', String(childX));
                childLine.setAttribute('y2', String(childY));
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
