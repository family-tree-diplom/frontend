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

        document.querySelectorAll('.connector-circle').forEach((el) => el.remove());
    }

    function getLineByKey(from: number, to: number): SVGLineElement | undefined {
        const key = `${from}-${to}`;
        return lineRefs.value.find((l: SVGLineElement) => l?.dataset?.relationKey === key) as
            | SVGLineElement
            | undefined;
    }

    function drawMarriageLines() {
        marriageCenters.value = {};

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

    function buildParentChildrenMap(): Record<number, number[]> {
        const map: Record<number, number[]> = {};

        relations.value
            .filter((r) => r.type === 'parent')
            .forEach((r) => {
                if (!map[r.from]) map[r.from] = [];
                if (!map[r.from].includes(r.to)) map[r.from].push(r.to);
            });

        return map;
    }

    function drawParentLines() {
        const parentChildren = buildParentChildrenMap();

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

                const parentsPair = findParentsOf(rel.to); // есть ли 2 родителя у ребёнка
                const childrenOfThisParent = parentChildren[rel.from] || [];

                if (parentsPair) {
                    line.style.display = 'none';
                    return;
                }

                if (childrenOfThisParent.length > 1) {
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

    function drawSiblingLines() {
        const siblingGroups: Record<string, { children: number[]; parents: number[]; singleParent: boolean }> = {};

        const parentChildren = buildParentChildrenMap();

        relations.value
            .filter((r) => r.type === 'parent')
            .forEach((r) => {
                const childId = r.to;
                const parentsArr = relations.value
                    .filter((p) => p.type === 'parent' && p.to === childId)
                    .map((p) => p.from)
                    .sort((a, b) => a - b);

                if (parentsArr.length === 2) {
                    const key = makePairKey(parentsArr[0], parentsArr[1]);
                    if (!siblingGroups[key]) {
                        siblingGroups[key] = { children: [], parents: parentsArr, singleParent: false };
                    }
                    if (!siblingGroups[key].children.includes(childId)) {
                        siblingGroups[key].children.push(childId);
                    }
                } else if (parentsArr.length === 1) {
                    const parentId = parentsArr[0];
                    const childrenOfParent = parentChildren[parentId] || [];

                    if (childrenOfParent.length > 1) {
                        const key = `single-${parentId}`;
                        if (!siblingGroups[key]) {
                            siblingGroups[key] = {
                                children: [],
                                parents: [parentId],
                                singleParent: true,
                            };
                        }
                        if (!siblingGroups[key].children.includes(childId)) {
                            siblingGroups[key].children.push(childId);
                        }
                    }
                }
            });

        Object.entries(siblingGroups).forEach(([key, group]) => {
            const { children, parents, singleParent } = group;
            if (!children.length) return;

            const els = children.map((id) => boxRefs.value[id]).filter(Boolean);
            if (!els.length) return;

            const mapped = children
                .map((id) => {
                    const el = boxRefs.value[id];
                    return {
                        id,
                        el,
                        x: positions[id].x + el.offsetWidth / 2,
                        y: positions[id].y,
                    };
                })
                .sort((a, b) => a.x - b.x);

            const first = mapped[0];
            const last = mapped[mapped.length - 1];

            const x1 = first.x;
            const x2 = last.x;
            const centerX = (x1 + x2) / 2;

            if (!group.singleParent && children.length === 1) {
                const child = mapped[0];

                const marriage = marriageCenters.value[key];
                if (marriage) {
                    const direct = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    direct.classList.add('connector-line', 'sibling-connector');
                    direct.setAttribute('x1', String(marriage.x));
                    direct.setAttribute('y1', String(marriage.y));
                    direct.setAttribute('x2', String(child.x)); // центр ребёнка
                    direct.setAttribute('y2', String(child.y)); // верх ребёнка
                    document.querySelector('.line-canvas')?.appendChild(direct);
                }
                return;
            }

            const minY = Math.min(...mapped.map((m) => m.y));
            const yAxis = minY - 40;

            if (!singleParent) {
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
            } else {
                const parentId = parents[0];
                const pel = boxRefs.value[parentId];
                const ppos = positions[parentId];
                if (pel && ppos) {
                    const px = ppos.x + pel.offsetWidth / 2;
                    const py = ppos.y + pel.offsetHeight;

                    const vertLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    vertLine.classList.add('connector-line', 'sibling-connector');
                    vertLine.setAttribute('x1', String(px));
                    vertLine.setAttribute('y1', String(py));
                    vertLine.setAttribute('x2', String(centerX));
                    vertLine.setAttribute('y2', String(yAxis));
                    document.querySelector('.line-canvas')?.appendChild(vertLine);
                }
            }

            const siblingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            siblingLine.classList.add('connector-line', 'sibling-line');
            siblingLine.setAttribute('x1', String(x1));
            siblingLine.setAttribute('y1', String(yAxis));
            siblingLine.setAttribute('x2', String(x2));
            siblingLine.setAttribute('y2', String(yAxis));
            document.querySelector('.line-canvas')?.appendChild(siblingLine);

            mapped.forEach(({ id, el }) => {
                const pos = positions[id];
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
