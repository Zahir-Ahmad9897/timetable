FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:web

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.js ./server.js
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "server.js"]
