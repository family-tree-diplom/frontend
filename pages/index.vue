<template>
    <div class="start-screen">

        <!-- Старовинна пергаментна текстура -->
        <div class="parchment"></div>

        <!-- Генеалогічне дерево -->
        <svg class="gene-tree" viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg">

            <!-- Ефект глоу -->
            <defs>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <!-- Деталізовані гілки -->
            <g stroke="#5d4b34" stroke-width="5" stroke-linecap="round"
               fill="none"
               opacity="0.65"
               class="lines-growing">

                <!-- Основна вертикаль -->
                <line x1="450" y1="780" x2="450" y2="600" />

                <!-- Розгалуження -->
                <line x1="450" y1="600" x2="320" y2="520" />
                <line x1="450" y1="600" x2="580" y2="520" />

                <!-- Дрібніші гілки -->
                <line x1="320" y1="520" x2="260" y2="460" />
                <line x1="320" y1="520" x2="370" y2="460" />

                <line x1="580" y1="520" x2="640" y2="460" />
                <line x1="580" y1="520" x2="530" y2="460" />

                <!-- Ще дрібніші -->
                <line x1="260" y1="460" x2="220" y2="410" />
                <line x1="260" y1="460" x2="300" y2="410" />

                <line x1="370" y1="460" x2="340" y2="410" />
                <line x1="370" y1="460" x2="400" y2="410" />

                <line x1="530" y1="460" x2="500" y2="410" />
                <line x1="530" y1="460" x2="560" y2="410" />

                <line x1="640" y1="460" x2="680" y2="410" />
                <line x1="640" y1="460" x2="600" y2="410" />

            </g>

            <!-- Вузли з глоу -->
            <g filter="url(#softGlow)" fill="#fffdf7" stroke="#4a6e5a" stroke-width="4" class="nodes-fade">

                <circle cx="450" cy="780" r="30" />
                <circle cx="450" cy="600" r="32" />

                <circle cx="320" cy="520" r="26" />
                <circle cx="580" cy="520" r="26" />

                <circle cx="260" cy="460" r="20" />
                <circle cx="370" cy="460" r="20" />
                <circle cx="530" cy="460" r="20" />
                <circle cx="640" cy="460" r="20" />

                <circle cx="220" cy="410" r="16" />
                <circle cx="300" cy="410" r="16" />
                <circle cx="340" cy="410" r="16" />
                <circle cx="400" cy="410" r="16" />
                <circle cx="500" cy="410" r="16" />
                <circle cx="560" cy="410" r="16" />
                <circle cx="600" cy="410" r="16" />
                <circle cx="680" cy="410" r="16" />

            </g>

        </svg>

        <!-- Контент поверх -->
        <div class="content">
            <h1>Родинне дерево</h1>
            <p>Старовинний родовід у сучасному виконанні.</p>

            <NuxtLink to="/main-tree" class="start-btn">
                Переглянути дерево
            </NuxtLink>
        </div>

    </div>
</template>


<style sass>
/* Плавна поява всього екрану */
.start-screen {
    animation: fadeScreen 1.1s ease forwards;
    opacity: 0;
}
@keyframes fadeScreen {
    to { opacity: 1; }
}

/* Фон: чистий сучасний градієнт */
.parchment {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 20%, #f8f1e5 0%, #e9dec9 55%, #d4c3a4 100%);
    z-index: 1;
}

/* Світлова віньєтка без текстури */
.parchment::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, transparent 65%, rgba(0,0,0,0.25) 100%);
    pointer-events: none;
    opacity: 0.4;
}

/* SVG-дерево */
.gene-tree {
    position: absolute;
    width: 95vmin;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
    pointer-events: none;
    opacity: 0.50;
    z-index: 2;
    filter: drop-shadow(0 0 16px rgba(0,0,0,0.35));
}

/* Лінії, що «ростуть» */
.lines-growing line {
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    animation: growLines 2.6s ease forwards;
}
@keyframes growLines {
    to { stroke-dashoffset: 0; }
}

/* Вузли, що з’являються */
.nodes-fade circle {
    opacity: 0;
    transform: scale(0.5);
    animation: revealNode 1.8s ease forwards;
}
@keyframes revealNode {
    to {
        opacity: 1;
        transform: scale(1);
    }
}
.nodes-fade circle:nth-child(1) { animation-delay: 0.35s; }
.nodes-fade circle:nth-child(2) { animation-delay: 0.50s; }
.nodes-fade circle:nth-child(3) { animation-delay: 0.65s; }
.nodes-fade circle:nth-child(4) { animation-delay: 0.80s; }
.nodes-fade circle:nth-child(10) { animation-delay: 1.45s; }

/* Контент */
.content {
    position: relative;
    z-index: 10;
    text-align: center;
    margin-top: 70px;
    opacity: 0;
    transform: translateY(15px);
    animation: slideContent 1.4s ease forwards 0.3s;
}
@keyframes slideContent {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.content h1 {
    font-size: 60px;
    color: #4b3724;
    margin-bottom: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-shadow: 0 3px 12px rgba(0,0,0,0.28);
}

.content p {
    font-size: 22px;
    color: #6a573d;
    margin-bottom: 40px;
    letter-spacing: 0.5px;
}

/* Кнопка – чистий, елегантний стиль */
.start-btn {
    display: inline-block;
    padding: 16px 42px;
    font-size: 21px;
    border-radius: 14px;
    text-decoration: none;
    color: white;

    background: linear-gradient(135deg, #8a683f, #a38255, #7a5a34);
    background-size: 200% 200%;
    animation: goldPulse 7s linear infinite;

    box-shadow:
        0 8px 26px rgba(0,0,0,0.30),
        inset 0 2px 6px rgba(255,255,255,0.25);

    transition: transform 0.25s ease;
}
@keyframes goldPulse {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

.start-btn:hover {
    transform: scale(1.06);
}
</style>

