/**
 * useCamera — глобальна камера для переміщення та масштабування сцени
 */
export function useCamera() {
    const camera = reactive({
        x: 0,
        y: 0,
        scale: 1,
        isDragging: false,
        startX: 0,
        startY: 0,
    });

    /* =======================================================
       1️⃣ Глобальне масштабування (колесо в будь-якому місці)
       ======================================================= */
    function onWheel(e: WheelEvent) {
        // Игнорируем зум, если пользователь скроллит внутри input/textarea
        const target = e.target as HTMLElement;
        if (target.closest('input, textarea, select, .draggable-box')) return;

        e.preventDefault();

        const zoomIntensity = 0.1;
        const delta = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
        const newScale = Math.min(Math.max(camera.scale * delta, 0.2), 3);

        // Позиция курсора относительно "мира" (учитывая смещение камеры и масштаб)
        const mouseX = (e.clientX - camera.x) / camera.scale;
        const mouseY = (e.clientY - camera.y) / camera.scale;

        // Двигаем смещение так, чтобы zoom был относительно курсора
        camera.x -= mouseX * (newScale - camera.scale);
        camera.y -= mouseY * (newScale - camera.scale);
        camera.scale = newScale;
    }

    /* =======================================================
       2️⃣ Глобальне панорамування
       ======================================================= */
    function onMouseDown(e: MouseEvent) {
        // Игнорируем drag карточек
        if ((e.target as HTMLElement).closest('.draggable-box')) return;
        if (e.button !== 0) return;

        e.preventDefault();
        camera.isDragging = true;
        camera.startX = e.clientX - camera.x;
        camera.startY = e.clientY - camera.y;

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
        if (!camera.isDragging) return;
        camera.x = e.clientX - camera.startX;
        camera.y = e.clientY - camera.startY;
    }

    function onMouseUp() {
        camera.isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }

    /* =======================================================
       3️⃣ Стиль трансформації
       ======================================================= */
    const cameraStyle = computed(() => ({
        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
        transformOrigin: '0 0',
    }));

    /* =======================================================
       4️⃣ Глобальні слухачі
       ======================================================= */
    if (process.client) {
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('wheel', onWheel, { passive: false }); // ← глобальний zoom
    }

    onBeforeUnmount(() => {
        if (process.client) {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
    });

    return {
        camera,
        cameraStyle,
    };
}
