// composables/useDraggable.ts
export type DraggableKey = number | string;

interface Position {
    x: number;
    y: number;
}

export function useDraggable(
    updateAllLines: () => void,
    camera: { scale: number },
    positions: Record<DraggableKey, Position>,
    selectedIds: Set<DraggableKey>,
    toggleSelect: (id: DraggableKey, multi?: boolean) => void
) {
    let isDragging = false;
    let wasSelectedBeforeMouseDown = false;
    let pressedId: DraggableKey | null = null;
    let startMouseX = 0;
    let startMouseY = 0;
    let startPositions: Record<DraggableKey, Position> = {} as any;
    const DRAG_THRESHOLD = 3;

    function onMouseDown(e: MouseEvent) {
        const el = (e.target as HTMLElement).closest('.draggable-box') as HTMLElement | null;
        if (!el) return;

        const rawId = el.dataset.id;
        if (!rawId) return;

        // Если это число – используем число, если нет – оставляем строку
        const numeric = Number(rawId);
        const id: DraggableKey = Number.isNaN(numeric) ? rawId : numeric;

        e.preventDefault();

        pressedId = id;
        wasSelectedBeforeMouseDown = selectedIds.has(id);
        const multi = e.shiftKey || e.ctrlKey || e.metaKey;

        startMouseX = e.clientX;
        startMouseY = e.clientY;
        isDragging = false;

        if (!wasSelectedBeforeMouseDown && !multi) {
            selectedIds.clear();
            selectedIds.add(id);
        } else if (!wasSelectedBeforeMouseDown && multi) {
            selectedIds.add(id);
        }

        startPositions = {} as any;
        selectedIds.forEach((sid) => {
            if (!positions[sid]) positions[sid] = { x: 0, y: 0 };
            startPositions[sid] = { ...positions[sid] };
        });

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
        const dx = e.clientX - startMouseX;
        const dy = e.clientY - startMouseY;

        if (!isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
            isDragging = true;
        }

        if (!isDragging) return;

        const scaledX = dx / camera.scale;
        const scaledY = dy / camera.scale;

        selectedIds.forEach((sid) => {
            if (!positions[sid]) positions[sid] = { x: 0, y: 0 };
            positions[sid].x = startPositions[sid].x + scaledX;
            positions[sid].y = startPositions[sid].y + scaledY;
        });

        updateAllLines();
    }

    function onMouseUp(e: MouseEvent) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (!pressedId) {
            isDragging = false;
            return;
        }

        const multi = e.shiftKey || e.ctrlKey || e.metaKey;

        if (!isDragging) {
            if (wasSelectedBeforeMouseDown) {
                isDragging = false;
                pressedId = null;
                return;
            }

            if (!multi) {
                selectedIds.clear();
                selectedIds.add(pressedId);
            } else {
                selectedIds.add(pressedId);
            }
        }

        isDragging = false;
        pressedId = null;
    }

    function makeDraggable(el: HTMLElement) {
        if ((el as any)._draggableBound) return;

        el.addEventListener('mousedown', onMouseDown);
        (el as any)._draggableBound = true;
    }

    return { makeDraggable };
}
