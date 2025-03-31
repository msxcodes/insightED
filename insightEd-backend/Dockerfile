FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps
COPY . .

FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    build-base \
    libc6-compat \
    libffi-dev \
    openssl-dev \
    && python3 -m venv /venv \
    && . /venv/bin/activate \
    && pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir yt-dlp brotli cryptography

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:${PATH}"

EXPOSE 5000
CMD ["node", "src/server.js"]