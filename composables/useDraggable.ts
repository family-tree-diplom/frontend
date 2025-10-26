// composables/useDraggable.ts
export function useDraggable(updateAllLines: () => void, camera?: any) {
    let activeElement: SVGGElement | null = null;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    function getMouseXY(e: PointerEvent) {
        const scale = camera?.scale ?? 1;
        const offsetX = camera?.x ?? 0;
        const offsetY = camera?.y ?? 0;
        return {
            x: (e.clientX - offsetX) / scale,
            y: (e.clientY - offsetY) / scale,
        };
    }

    function onPointerDown(e: PointerEvent) {
        const target = (e.target as HTMLElement).closest('.draggable-card') as SVGGElement | null;
        if (!target) return;

        // Заборона камерi перехоплювати цей drag
        e.stopPropagation();
        e.preventDefault();

        activeElement = target;

        const p = getMouseXY(e);
        startX = p.x;
        startY = p.y;

        const transform = activeElement.getAttribute('transform');
        const match = transform?.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        if (match) {
            initialX = parseFloat(match[1]);
            initialY = parseFloat(match[2]);
        } else {
            initialX = 0;
            initialY = 0;
        }

        // Захоплюємо pointer, щоб не губити події при швидкому русі
        (e.target as Element).setPointerCapture?.(e.pointerId);

        document.addEventListener('pointermove', onPointerMove, { passive: false });
        document.addEventListener('pointerup', onPointerUp, { passive: false });
    }

    function onPointerMove(e: PointerEvent) {
        if (!activeElement) return;

        // Не дозволяємо скрол/жести під час drag
        e.preventDefault();

        const p = getMouseXY(e);
        const newX = initialX + (p.x - startX);
        const newY = initialY + (p.y - startY);

        activeElement.setAttribute('transform', `translate(${newX}, ${newY})`);
        updateAllLines();
    }

    function onPointerUp(e: PointerEvent) {
        if (!activeElement) return;
        (e.target as Element)?.releasePointerCapture?.(e.pointerId);
        activeElement = null;

        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
    }

    function makeDraggable(el: SVGGElement) {
        // capture:true — щоб наш handler спрацьовував перед панорамуванням камери
        el.addEventListener('pointerdown', onPointerDown, { capture: true });
        // На всяк випадок вмикаємо курсор:
        el.style.cursor = 'grab';
    }

    onBeforeUnmount(() => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
    });

    return { makeDraggable };
}
