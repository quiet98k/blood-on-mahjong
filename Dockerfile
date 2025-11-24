# ─────────────── Build Stage ───────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─────────────── Production Stage ───────────────
FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["npx", "nuxt", "start"]
