FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared packages/shared
COPY web web

RUN npm ci
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=web

FROM alpine:3.20
COPY --from=build /app/web/dist /dist
