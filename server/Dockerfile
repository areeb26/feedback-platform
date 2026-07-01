FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared packages/shared
COPY server server

RUN npm ci
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY server/package.json server/package.json
COPY --from=build /app/server/dist server/dist

RUN npm ci --omit=dev --workspace=server --workspace=packages/shared

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
