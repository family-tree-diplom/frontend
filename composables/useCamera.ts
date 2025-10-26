/**
 * useCamera — керує положенням і масштабом “віртуальної камери”
 * для перегляду сімейного дерева.
 */
export function useCamera() {
    // Реактивний стан камери
    const camera = reactive({
        x: 0,
        y: 0,
        scale: 1,
        isDragging: false,
        startX: 0,
        startY: 0,
    });

    /* ====== Обробники подій ====== */

    // Масштабування коліщатком миші
    function onWheel(e: WheelEvent) {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const delta = e.deltaY < 0 ? 1 + zoomIntensity : 1 - zoomIntensity;
        const newScale = Math.min(Math.max(camera.scale * delta, 0.2), 3);

        // координаты мыши относительно world-space
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - camera.x) / camera.scale;
        const mouseY = (e.clientY - rect.top - camera.y) / camera.scale;

        // пересчитываем смещение так, чтобы zoom был к курсору
        camera.x -= mouseX * (newScale - camera.scale);
        camera.y -= mouseY * (newScale - camera.scale);
        camera.scale = newScale;
    }

    // Початок перетягування (панорамування)
    function onMouseDown(e: MouseEvent) {
        if ((e.target as HTMLElement).closest('.draggable-box')) return; // ігноруємо, якщо тягнемо людину
        camera.isDragging = true;
        camera.startX = e.clientX - camera.x;
        camera.startY = e.clientY - camera.y;
    }

    // Рух миші під час перетягування
    function onMouseMove(e: MouseEvent) {
        if (!camera.isDragging) return;
        camera.x = e.clientX - camera.startX;
        camera.y = e.clientY - camera.startY;
    }

    // Кінець перетягування
    function onMouseUp() {
        camera.isDragging = false;
    }

    /* ====== Зручний computed-стиль для transform ====== */
    const cameraStyle = computed(() => ({
        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
        transformOrigin: '0 0',
    }));

    return {
        camera,
        cameraStyle,
        onWheel,
        onMouseDown,
        onMouseMove,
        onMouseUp,
    };
}
