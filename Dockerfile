# Етап 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Копіюємо package.json та lock файл для встановлення залежностей
COPY package*.json ./
# Якщо у тебе pnpm або yarn, заміни команду нижче на відповідну
RUN npm install

# Копіюємо всі файли проекту
COPY . .

# Збираємо Nuxt додаток (SSR або SSG, залежно від налаштувань)
RUN npm run build

# Етап 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NUXT_PORT=3000

# Копіюємо залежності лише для продакшену
COPY --from=builder /app/node_modules ./node_modules

# Копіюємо зібраний Nuxt-додаток
COPY --from=builder /app/.output ./.output

# Копіюємо nuxt.config файл, якщо потрібно
COPY --from=builder /app/nuxt.config.* ./

# За замовчуванням Nuxt слухає порт 3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
