FROM node:24-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
ENV API_UPSTREAM=api:8000
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/terapist.conf.template
COPY scripts/serve-frontend.sh /usr/local/bin/serve-frontend.sh
USER root
RUN sed -i 's@/etc/nginx/conf.d/\*.conf@/tmp/terapist-nginx.conf@' /etc/nginx/nginx.conf
USER 101
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "/usr/local/bin/serve-frontend.sh"]
