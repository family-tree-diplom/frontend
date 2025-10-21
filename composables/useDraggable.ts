export function useDraggable(updateLines: () => void) {
    function makeDraggable(el: HTMLElement) {
        let oldX = 0,
            oldY = 0,
            x = 0,
            y = 0;
        const handle = (el.querySelector('.drag-handle') as HTMLElement) || el;

        const elementDrag = (e: MouseEvent) => {
            e.preventDefault();
            oldX = x - e.clientX;
            oldY = y - e.clientY;
            x = e.clientX;
            y = e.clientY;
            el.style.top = `${el.offsetTop - oldY}px`;
            el.style.left = `${el.offsetLeft - oldX}px`;
            updateLines();
        };

        const closeDrag = () => {
            document.removeEventListener('mouseup', closeDrag);
            document.removeEventListener('mousemove', elementDrag);
        };

        const dragMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            x = e.clientX;
            y = e.clientY;
            document.addEventListener('mouseup', closeDrag);
            document.addEventListener('mousemove', elementDrag);
        };

        handle.addEventListener('mousedown', dragMouseDown);
        el.style.position = 'absolute';

        onUnmounted(() => {
            handle.removeEventListener('mousedown', dragMouseDown);
        });
    }

    return { makeDraggable };
}
