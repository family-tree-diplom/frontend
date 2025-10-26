/**
 * Варіант 2: Батьки → точка шлюбу → діти
 * - Пряму батьківську лінію ховаємо, якщо у дитини є двоє батьків
 * - Малюємо лінію між батьками (шлюб)
 * - Від точки шлюбу вертикаль до «осі дітей», горизонталь між дітьми,
 *   та вертикалі від осі до кожної дитини
 */
export function useFamilyLines(boxRefs, lineRefs, circleRefs, relations) {
    // Центри шлюбів (для побудови вертикалі до осі дітей)
    const marriageCenters = ref<Record<string, { x: number; y: number }>>({});

    /* =================== Утиліти =================== */

    // Стабільний ключ для пари (напр., "3-7")
    function makePairKey(a: number, b: number): string {
        return [a, b].sort((x, y) => x - y).join('-');
    }

    // Пошук обох батьків дитини
    function findParentsOf(childId: number) {
        const parents = relations.value.filter((r) => r.type === 'parent' && r.to === childId).map((r) => r.from);
        if (parents.length === 2) {
            const [parentA, parentB] = parents.sort((a, b) => a - b);
            return { parentA, parentB };
        }
        return null;
    }

    // Безпечне очищення тимчасових ліній (тільки динамічно створюваних)
    function clearDynamicLines() {
        document
            .querySelectorAll('.sibling-line, .sibling-child-line, .sibling-connector')
            .forEach((el) => el.remove());
    }

    // Знаходимо <line> у шаблоні за ключем from-to
    function getLineByKey(from: number, to: number): SVGLineElement | undefined {
        const key = `${from}-${to}`;
        return lineRefs.value.find((l: SVGLineElement) => l?.dataset?.relationKey === key) as
            | SVGLineElement
            | undefined;
    }

    /* =================== Шлюбні лінії =================== */
    function drawMarriageLines() {
        marriageCenters.value = {};

        relations.value
            .filter((r) => r.type === 'marriage')
            .forEach((rel) => {
                const el1 = boxRefs.value[rel.from];
                const el2 = boxRefs.value[rel.to];
                const line = getLineByKey(rel.from, rel.to);

                if (!el1 || !el2 || !line) return;

                // Центри карток батьків
                const x1 = el1.offsetLeft + el1.offsetWidth / 2;
                const y1 = el1.offsetTop + el1.offsetHeight / 2;
                const x2 = el2.offsetLeft + el2.offsetWidth / 2;
                const y2 = el2.offsetTop + el2.offsetHeight / 2;

                // Лінія між батьками (шлюб)
                line.setAttribute('x1', String(x1));
                line.setAttribute('y1', String(y1));
                line.setAttribute('x2', String(x2));
                line.setAttribute('y2', String(y2));
                line.style.display = 'block';

                // Центр шлюбної лінії (для точки шлюбу + побудови осі дітей)
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;

                const key = makePairKey(rel.from, rel.to);
                const circle = circleRefs.value[key];
                if (circle) {
                    circle.setAttribute('cx', String(cx));
                    circle.setAttribute('cy', String(cy));
                }
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

                // ВАРІАНТ 2: якщо у дитини двоє батьків — не малюємо пряму лінію батько/мати → дитина
                const parents = findParentsOf(rel.to);
                if (parents) {
                    line.style.display = 'none';
                    return;
                }

                // Якщо один із батьків відсутній — тоді малюємо пряму батьківську лінію
                const x1 = el1.offsetLeft + el1.offsetWidth / 2;
                const y1 = el1.offsetTop + el1.offsetHeight;
                const x2 = el2.offsetLeft + el2.offsetWidth / 2;
                const y2 = el2.offsetTop;

                line.setAttribute('x1', String(x1));
                line.setAttribute('y1', String(y1));
                line.setAttribute('x2', String(x2));
                line.setAttribute('y2', String(y2));
                line.style.display = 'block';
            });
    }

    /* =========== Вісь і вертикалі між братами/сестрами =========== */
    function drawSiblingLines() {
        const siblingGroups: Record<string, number[]> = {};

        // Групуємо дітей за парою батьків
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

            // Координати «осі дітей»
            const first = els[0];
            const last = els[els.length - 1];
            const x1 = first.offsetLeft + first.offsetWidth / 2;
            const x2 = last.offsetLeft + last.offsetWidth / 2;
            const centerX = (x1 + x2) / 2;
            const yAxis = els.length === 1 ? els[0].offsetTop : Math.min(...els.map((el) => el.offsetTop)) - 40;

            // Вертикаль від точки шлюбу до осі дітей
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

            // Горизонтальна вісь між дітьми
            const siblingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            siblingLine.classList.add('connector-line', 'sibling-line');
            siblingLine.setAttribute('x1', String(x1));
            siblingLine.setAttribute('y1', String(yAxis));
            siblingLine.setAttribute('x2', String(x2));
            siblingLine.setAttribute('y2', String(yAxis));
            document.querySelector('.line-canvas')?.appendChild(siblingLine);

            // Короткі вертикалі від осі до кожної дитини
            els.forEach((el) => {
                const childX = el.offsetLeft + el.offsetWidth / 2;
                const childY = el.offsetTop;
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

    /* =================== Основна функція =================== */
    function updateAllLines() {
        clearDynamicLines();
        drawMarriageLines();
        drawParentLines();
        drawSiblingLines();
    }

    return { updateAllLines, marriageCenters, makePairKey };
}
