export function useDraggable(updateAllLines, camera, positions, selectedIds, toggleSelect) {
    let isDragging = false;
    let wasSelectedBeforeMouseDown = false;
    let pressedId: number | null = null;
    let startMouseX = 0;
    let startMouseY = 0;
    let startPositions = {};
    const DRAG_THRESHOLD = 3;

    function onMouseDown(e: MouseEvent) {
        const el = (e.target as HTMLElement).closest('.draggable-box');
        if (!el) return;

        const id = Number(el.dataset.id);
        if (!id) return;

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

        startPositions = {};
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
            positions[sid].x = startPositions[sid].x + scaledX;
            positions[sid].y = startPositions[sid].y + scaledY;
        });

        updateAllLines();
    }

    function onMouseUp(e: MouseEvent) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const multi = e.shiftKey || e.ctrlKey || e.metaKey;

        if (!isDragging) {
            if (wasSelectedBeforeMouseDown) return;

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
        el.addEventListener('mousedown', onMouseDown);
    }

    return { makeDraggable };
}
