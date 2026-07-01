ARG WEB_IMAGE=feedback-platform-web
FROM ${WEB_IMAGE} AS web

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /dist /usr/share/nginx/html
