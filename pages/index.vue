<template>
    <div class="start-screen">
        <!-- Decorative circles -->
        <div class="circle circle1"></div>
        <div class="circle circle2"></div>

        <div class="content">
            <h1>Родинне дерево</h1>
            <p>Збереження історії поколінь у сучасному веб-застосунку.</p>

            <nuxt-link to="/main-tree" class="start-btn">
                Перейти до дерева
            </nuxt-link>
        </div>

        <!-- bottom wave -->
        <svg class="wave" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="#ffffff" fill-opacity="1"
                  d="M0,256L60,224C120,192,240,128,360,122.7C480,117,600,171,720,181.3C840,192,960,160,1080,160C1200,160,1320,192,1380,208L1440,224V320H0Z">
            </path>
        </svg>
    </div>
</template>

<style scoped>
.start-screen {
    min-height: 100vh;
    background: linear-gradient(to bottom, #d4f7df, #8ed9b6);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    overflow: hidden;
    padding: 0 20px;
}

/* Decorative blurred circles */
.circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
    animation: float 6s ease-in-out infinite;
}

.circle1 {
    width: 250px;
    height: 250px;
    background: rgba(255, 255, 255, 0.5);
    top: 50px;
    left: 80px;
    animation-delay: 0s;
}

.circle2 {
    width: 350px;
    height: 350px;
    background: rgba(255, 255, 255, 0.3);
    bottom: 60px;
    right: 60px;
    animation-delay: 2s;
}

@keyframes float {
    0%, 100% {
        transform: translateY(0px);
    }
    50% {
        transform: translateY(25px);
    }
}

.content h1 {
    font-size: 48px;
    color: #155f3e;
    margin-bottom: 10px;
    text-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.content p {
    font-size: 18px;
    color: #1f7a55;
    margin-bottom: 30px;
}

.start-btn {
    display: inline-block;
    padding: 14px 32px;
    background: #1a8f5a;
    color: white;
    text-decoration: none;
    font-size: 18px;
    border-radius: 12px;
    transition: 0.3s ease;
    box-shadow: 0 5px 18px rgba(0, 0, 0, 0.15);
}

.start-btn:hover {
    background: #146f46;
    transform: scale(1.05);
}

/* bottom wave */
.wave {
    position: absolute;
    bottom: 0;
    width: 100%;
}
</style>
