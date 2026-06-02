FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
RUN if [ -f bun.lock ]; then bun install --frozen-lockfile; else bun install; fi

COPY . .

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

RUN bunx expo export --platform web

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
