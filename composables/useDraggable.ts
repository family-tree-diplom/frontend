export function useDraggable(
    updateAllLines: () => void,
    camera: any,
    positions: Record<number, { x: number; y: number }>
) {
    let activeId: number | null = null
    let startMouseX = 0
    let startMouseY = 0
    let startX = 0
    let startY = 0

    function onMouseDown(e: MouseEvent) {
        const target = (e.target as HTMLElement).closest('.draggable-box') as HTMLElement
        if (!target) return

        const idText = target.querySelector('small:last-child')?.textContent
        const id = idText ? Number(idText.trim()) : NaN
        if (isNaN(id)) return

        e.preventDefault()
        activeId = id

        startMouseX = e.clientX
        startMouseY = e.clientY
        startX = positions[id]?.x ?? 0
        startY = positions[id]?.y ?? 0

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    function onMouseMove(e: MouseEvent) {
        if (activeId === null) return

        const dx = (e.clientX - startMouseX) / camera.scale
        const dy = (e.clientY - startMouseY) / camera.scale

        if (!positions[activeId]) positions[activeId] = { x: 0, y: 0 }

        positions[activeId].x = startX + dx
        positions[activeId].y = startY + dy

        updateAllLines()
    }

    function onMouseUp() {
        activeId = null
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
    }

    function makeDraggable(el: HTMLElement) {
        el.addEventListener('mousedown', onMouseDown)
    }

    return { makeDraggable }
}
