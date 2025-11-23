interface Position {
    x: number;
    y: number;
}
interface People {
    id: number;
    birth_day?: string /* ... */;
}
interface Relation {
    from: number;
    to: number;
    type: string;
}
interface SiblingGroup {
    parents: number[];
    children: number[];
}

// --- КОНСТАНТЫ ---
const ROW_GAP = 250; // Вертикальный отступ между поколениями
const SIBLING_GAP = 250; // Горизонтальный отступ между сиблингами/детьми
const MARRIAGE_GAP = 150; // Горизонтальный отступ между супругами
const PARENT_GAP = 400; // Горизонтальный отступ между родителями (если брак не задан)

// --- ОСНОВНАЯ КОМПОЗИЦИОННАЯ ФУНКЦИЯ ---
export function useFamilyLayout(
    peoples: Ref<People[]>,
    relations: Ref<Relation[]>,
    updateAllLines: () => void,
    savePositions: () => void
) {
    // generationMap теперь нужен для Y-координаты
    const positions = reactive<Record<number, Position>>({});
    const generationMap = reactive<Record<number, number>>({});

    // --- ЛОГИКА ГРУППИРОВКИ (Определение сиблингов) ---
    const siblingGroups = computed<SiblingGroup[]>(() => {
        const parentsByChild: Record<number, number[]> = {};
        const groupsByParents: Record<string, SiblingGroup> = {};

        relations.value
            .filter((r) => r.type === 'parent')
            .forEach((r) => {
                if (!parentsByChild[r.to]) parentsByChild[r.to] = [];
                if (!parentsByChild[r.to].includes(r.from)) {
                    parentsByChild[r.to].push(r.from);
                }
            });

        Object.entries(parentsByChild).forEach(([childIdStr, parents]) => {
            if (parents.length === 0) return;

            const sortedParents = (parents as number[]).sort((a, b) => a - b);
            const key = sortedParents.join('-');

            if (!groupsByParents[key]) {
                groupsByParents[key] = { parents: sortedParents, children: [] };
            }
            groupsByParents[key].children.push(Number(childIdStr));
        });

        return Object.values(groupsByParents);
    });

    // --- ФУНКЦИИ КОМПОНОВКИ (ЭТАП 1) ---

    // Этап 1: Выравнивание браков по горизонтали
    function alignMarriages() {
        relations.value
            .filter((r) => r.type === 'marriage')
            // Сортируем, чтобы пары с наименьшим ID обрабатывались первыми
            .sort((a, b) => a.from - b.from)
            .forEach((r) => {
                const p1 = r.from;
                const p2 = r.to;

                // 1. Инициализируем позиции, если их нет
                if (!positions[p1]) positions[p1] = { x: 0, y: 0 };
                if (!positions[p2]) positions[p2] = { x: 0, y: 0 };

                // 2. Определяем среднюю точку X и Y
                const currentAvgX = (positions[p1].x + positions[p2].x) / 2;
                // Y: берем минимальный Y, чтобы выровнять по верхней точке
                const currentAvgY = Math.min(positions[p1].y, positions[p2].y);

                // 3. Пересчитываем и устанавливаем новые позиции
                positions[p1] = {
                    x: currentAvgX - MARRIAGE_GAP / 2,
                    y: currentAvgY,
                };
                positions[p2] = {
                    x: currentAvgX + MARRIAGE_GAP / 2,
                    y: currentAvgY,
                };
            });
    }

    // --- ФУНКЦИИ КОМПОНОВКИ (ЭТАП 2) ---

    // Этап 2: Назначение поколений (Y-координата)
    function calculateGenerations() {
        const allPeoplesIds = peoples.value.map((p) => p.id);
        const childSet = new Set(relations.value.filter((r) => r.type === 'parent').map((r) => r.to));
        const roots = allPeoplesIds.filter((id) => !childSet.has(id));

        const queue: number[] = [];
        const visited = new Set<number>();

        // Инициализация корней (Gen 0)
        roots.forEach((id) => {
            generationMap[id] = 0;
            queue.push(id);
            visited.add(id);
        });

        let head = 0;
        while (head < queue.length) {
            const currentId = queue[head++];
            const currentGen = generationMap[currentId];

            relations.value
                .filter((r) => r.type === 'parent' && r.from === currentId)
                .map((r) => r.to)
                .forEach((childId) => {
                    const newGen = currentGen + 1;
                    // Обновляем поколение, только если нашли более глубокое
                    if ((generationMap[childId] || -1) < newGen) {
                        generationMap[childId] = newGen;
                        if (!visited.has(childId)) {
                            queue.push(childId);
                            visited.add(childId);
                        }
                    }
                });
        }

        // Применяем Y-координату
        allPeoplesIds.forEach((id) => {
            if (generationMap[id] !== undefined) {
                if (!positions[id]) positions[id] = { x: 0, y: 0 };
                positions[id].y = generationMap[id] * ROW_GAP;
            }
        });
    }

    // --- ФУНКЦИИ КОМПОНОВКИ (ЭТАП 3) ---

    // Этап 3: Выравнивание детей (X-координата)
    function alignSiblings() {
        // Карта для отслеживания правого края ветки в каждом поколении (для предотвращения наложений)
        // Этот Map не позволяет наложениям, но требует, чтобы корни были расставлены вручную!
        const occupiedXByGen: Record<number, number> = {};

        // Сортируем группы, чтобы обрабатывать их в стабильном порядке
        const sortedGroups = siblingGroups.value.sort((a, b) => a.parents[0] - b.parents[0]);

        sortedGroups.forEach((group) => {
            if (!group.children.length) return;

            let centerX = 0;
            const parents = group.parents;

            // 1. Сортировка детей по дате рождения (чтобы они были в правильном порядке)
            group.children.sort((aId, bId) => {
                const pA = peoples.value.find((p) => p.id === aId);
                const pB = peoples.value.find((p) => p.id === bId);
                const dateA = pA?.birth_day || '9999';
                const dateB = pB?.birth_day || '9999';
                return dateA > dateB ? 1 : dateA < dateB ? -1 : 0;
            });

            // 2. Определение X-центра для группы

            // Если родителей двое, центр — это точка между ними (которая уже выровнена alignMarriages)
            if (parents.length === 2) {
                centerX = ((positions[parents[0]]?.x || 0) + (positions[parents[1]]?.x || 0)) / 2;
            }
            // Если родитель один, центр — его X-координата
            else if (parents.length === 1) {
                centerX = positions[parents[0]]?.x || 0;
            } else {
                return; // Не должно случиться, но на всякий случай
            }

            // 3. Расстановка детей
            const totalChildrenWidth = (group.children.length - 1) * SIBLING_GAP;
            const startX = centerX - totalChildrenWidth / 2;

            // Определяем Y детей (на поколение ниже родителей)
            const childGen = generationMap[group.children[0]] || 0;
            const baseY = childGen * ROW_GAP;

            group.children.forEach((childId, i) => {
                if (!positions[childId]) positions[childId] = { x: 0, y: 0 };
                positions[childId].x = startX + i * SIBLING_GAP;
                positions[childId].y = baseY; // Фиксируем Y
            });

            // 4. (ОПЦИОНАЛЬНОЕ УЛУЧШЕНИЕ: Сдвиг, если дети накладываются)
            // Здесь можно добавить более сложную логику, если дети, выровненные по X, накладываются
            // на соседние ветки того же поколения. Пока оставляем простое центрирование.
        });
    }

    // --- ОСНОВНОЙ ВЫЗОВ ---
    function runLayout() {
        // 1. Выравнивание браков (фиксирует Y и X для супругов)
        alignMarriages();

        // 2. Назначение поколений (фиксирует Y для всех)
        calculateGenerations();

        // 3. Выравнивание сиблингов (фиксирует X для детей)
        alignSiblings();

        // Обязательные действия
        updateAllLines();
        savePositions();
    }

    return {
        positions,
        runLayout,
    };
}
