/**
 * Робить елементи перетягуваними з урахуванням масштабу та зсуву камери.
 */
export function useDraggable(updateAllLines: () => void, camera?: any) {
    let activeElement: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function onMouseDown(e: MouseEvent) {
        const target = (e.target as HTMLElement).closest('.draggable-box') as HTMLElement;
        if (!target) return;

        activeElement = target;

        // Запам’ятовуємо початкові координати миші (з урахуванням камери)
        startX = (e.clientX - (camera?.x || 0)) / (camera?.scale || 1);
        startY = (e.clientY - (camera?.y || 0)) / (camera?.scale || 1);

        // Поточне положення елемента
        initialLeft = parseFloat(activeElement.style.left || '0');
        initialTop = parseFloat(activeElement.style.top || '0');

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
        if (!activeElement) return;

        const scale = camera?.scale || 1;
        const offsetX = camera?.x || 0;
        const offsetY = camera?.y || 0;

        // Поточна позиція миші у координатах дерева (з урахуванням transform)
        const currentX = (e.clientX - offsetX) / scale;
        const currentY = (e.clientY - offsetY) / scale;

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        activeElement.style.left = `${initialLeft + deltaX}px`;
        activeElement.style.top = `${initialTop + deltaY}px`;

        updateAllLines();
    }

    function onMouseUp() {
        if (!activeElement) return;
        activeElement = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    function makeDraggable(el: HTMLElement) {
        el.addEventListener('mousedown', onMouseDown);
    }

    onBeforeUnmount(() => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    });

    return { makeDraggable };
}
