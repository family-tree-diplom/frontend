<template>
    <div class="start-screen" :class="{ 'is-leaving': isLeaving }">
        <!-- Фон -->
        <div class="parchment">
            <div class="sunlight"></div>
            <div class="grain-overlay"></div>
            <div class="wave-overlay"></div>
        </div>

        <!-- Частинки пилу -->
        <div class="dust-layer">
            <span class="dust dust-1"></span>
            <span class="dust dust-2"></span>
            <span class="dust dust-3"></span>
            <span class="dust dust-4"></span>
            <span class="dust dust-5"></span>
        </div>

        <!-- Генеалогічне дерево -->
        <svg class="gene-tree" viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <!-- Лінії дерева -->
            <g stroke="#5d4b34" stroke-width="5" stroke-linecap="round"
               fill="none"
               opacity="0.65"
               class="lines-growing">

                <line x1="450" y1="780" x2="450" y2="600" />

                <line x1="450" y1="600" x2="320" y2="520" />
                <line x1="450" y1="600" x2="580" y2="520" />

                <line x1="320" y1="520" x2="260" y2="460" />
                <line x1="320" y1="520" x2="370" y2="460" />

                <line x1="580" y1="520" x2="640" y2="460" />
                <line x1="580" y1="520" x2="530" y2="460" />

                <line x1="260" y1="460" x2="220" y2="410" />
                <line x1="260" y1="460" x2="300" y2="410" />

                <line x1="370" y1="460" x2="340" y2="410" />
                <line x1="370" y1="460" x2="400" y2="410" />

                <line x1="530" y1="460" x2="500" y2="410" />
                <line x1="530" y1="460" x2="560" y2="410" />

                <line x1="640" y1="460" x2="680" y2="410" />
                <line x1="640" y1="460" x2="600" y2="410" />
            </g>

            <!-- Вузли -->
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

        <!-- Контент -->
        <div class="content">
            <h1>Родинне дерево</h1>

            <!-- Золотий декоративний елемент -->
            <div class="headline-decor">
                <span class="line"></span>
                <span class="star">✦</span>
                <span class="line"></span>
            </div>

            <!-- Новий підзаголовок -->
            <p class="tagline">Історія, яку ми зберігаємо.</p>

            <p>Старовинний родовід у сучасному виконанні.</p>

            <NuxtLink to="/main-tree" class="start-btn" @click="onStartClick">
                Переглянути дерево
            </NuxtLink>
        </div>
    </div>
</template>

<script setup lang="ts">
const isLeaving = ref(false);

const onStartClick = () => {
    isLeaving.value = true;
};
</script>

<style scoped>
/* Загальні налаштування екрану */
.start-screen {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    opacity: 0;
    animation: fadeScreen 1.1s ease forwards;
}

.start-screen.is-leaving {
    animation: leaveScreen 0.6s ease forwards;
}

@keyframes fadeScreen {
    to { opacity: 1; }
}

@keyframes leaveScreen {
    to {
        opacity: 0;
        transform: scale(1.02);
        filter: blur(4px);
    }
}

/* Фон без текстур, але з життям */
.parchment {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 20%, #f8f1e5 0%, #e9dec9 55%, #d4c3a4 100%);
    z-index: 1;
    overflow: hidden;
}

/* Легкий grain через градієнти (без зображень) */
.grain-overlay {
    position: absolute;
    inset: -50px;
    opacity: 0.12;
    pointer-events: none;
    background-image:
        repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 2px),
        repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px);
}

/* Сонячна анімація */
.sunlight {
    position: absolute;
    width: 70%;
    height: 60%;
    left: 50%;
    top: -10%;
    transform: translateX(-50%);
    background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.0) 60%);
    opacity: 0.65;
    animation: sunPulse 6s ease-in-out infinite;
    pointer-events: none;
}

@keyframes sunPulse {
    0% { opacity: 0.5; transform: translateX(-50%) translateY(0); }
    50% { opacity: 0.8; transform: translateX(-50%) translateY(6px); }
    100% { opacity: 0.5; transform: translateX(-50%) translateY(0); }
}

/* Легка хвиля на пергаменті */
.wave-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 80%, rgba(255,255,255,0.18), transparent 60%);
    opacity: 0.6;
    animation: waveMove 10s ease-in-out infinite;
    pointer-events: none;
}

@keyframes waveMove {
    0% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-10px); opacity: 0.7; }
    100% { transform: translateY(0); opacity: 0.4; }
}

/* Частинки пилу */
.dust-layer {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
}

.dust {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 999px;
    background: rgba(255,255,255,0.7);
    box-shadow: 0 0 6px rgba(255,255,255,0.8);
    opacity: 0;
    animation: dustFloat 12s linear infinite;
}

.dust-1 { top: 20%; left: 18%; animation-delay: 0s; }
.dust-2 { top: 35%; left: 70%; animation-delay: 3s; }
.dust-3 { top: 60%; left: 30%; animation-delay: 6s; }
.dust-4 { top: 50%; left: 85%; animation-delay: 1.5s; }
.dust-5 { top: 15%; left: 55%; animation-delay: 8s; }

@keyframes dustFloat {
    0% { transform: translateY(10px); opacity: 0; }
    10% { opacity: 0.4; }
    50% { transform: translateY(-20px) translateX(5px); opacity: 0.7; }
    90% { opacity: 0.2; }
    100% { transform: translateY(0) translateX(0); opacity: 0; }
}

/* SVG-дерево з легкою перспективою */
.gene-tree {
    position: absolute;
    width: 95vmin;
    bottom: -30px;
    left: 50%;
    transform:
        translateX(-50%)
        rotate(180deg)
        scaleX(1.02)
        skewX(-2deg);
    pointer-events: none;
    opacity: 0.5;
    z-index: 2;
    filter: drop-shadow(0 0 16px rgba(0,0,0,0.35));
}

/* Лінії, що ростуть */
.lines-growing line {
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    animation: growLines 2.6s ease forwards;
}

@keyframes growLines {
    to { stroke-dashoffset: 0; }
}

/* Вузли: поява + “живе світло” */
.nodes-fade circle {
    opacity: 0;
    transform: scale(0.5);
    animation:
        revealNode 1.8s ease forwards,
        pulseNode 6s ease-in-out infinite;
    animation-delay: 0.35s, 2s;
}

@keyframes revealNode {
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes pulseNode {
    0% { transform: scale(1);   opacity: 1; }
    50% { transform: scale(1.03); opacity: 0.94; }
    100% { transform: scale(1); opacity: 1; }
}

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

/* Заголовок з м’якою тінню */
.content h1 {
    font-size: 60px;
    color: #4b3724;
    margin-bottom: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-shadow: 0 6px 18px rgba(0,0,0,0.35);
}

/* Золотий декоративний елемент під заголовком */
.headline-decor {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 10px;
}

.headline-decor .line {
    width: 80px;
    height: 1px;
    background: linear-gradient(90deg, transparent, #b18a4a, transparent);
}

.headline-decor .star {
    font-size: 16px;
    color: #b18a4a;
}

/* Новий підзаголовок */
.content .tagline {
    font-size: 20px;
    color: #6a573d;
    margin-bottom: 8px;
    letter-spacing: 0.6px;
    font-style: italic;
}

.content p {
    font-size: 18px;
    color: #6a573d;
    margin-bottom: 40px;
}

/* Кнопка – об’ємна, 3D-lite, з появою знизу */
.start-btn {
    display: inline-block;
    padding: 16px 42px;
    font-size: 21px;
    border-radius: 14px;
    text-decoration: none;
    color: white;

    background: linear-gradient(135deg, #8a683f, #a38255, #7a5a34);
    background-size: 200% 200%;
    animation:
        goldPulse 7s linear infinite,
        buttonEnter 0.8s ease forwards 0.9s;

    box-shadow:
        0 10px 28px rgba(0,0,0,0.35),
        inset 0 2px 6px rgba(255,255,255,0.25);

    opacity: 0;
    transform: translateY(18px);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
}

@keyframes goldPulse {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

@keyframes buttonEnter {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.start-btn:hover {
    transform: translateY(-2px) scale(1.04);
    box-shadow:
        0 14px 32px rgba(0,0,0,0.4),
        inset 0 2px 6px rgba(255,255,255,0.3);
}

.start-btn:active {
    transform: translateY(1px) scale(1.02);
    box-shadow:
        0 8px 20px rgba(0,0,0,0.3),
        inset 0 2px 4px rgba(255,255,255,0.25);
}

/* Адаптивність */
@media (max-width: 768px) {
    .content h1 {
        font-size: 40px;
    }

    .headline-decor .line {
        width: 50px;
    }

    .content .tagline {
        font-size: 18px;
    }

    .content p {
        font-size: 16px;
        margin-bottom: 30px;
    }

    .start-btn {
        font-size: 18px;
        padding: 14px 32px;
    }

    .gene-tree {
        width: 110vmin;
    }
}
</style>
