# syntax = docker/dockerfile:1

# Base image with pnpm
FROM node:20.18.0-slim as base
LABEL fly_launch_runtime="Node.js"
WORKDIR /app
ENV NODE_ENV="production"
RUN npm install -g pnpm@latest

# Build stage
FROM base as build
COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
RUN pnpm run build

# Production stage
FROM base
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/dist ./dist
RUN pnpm install --frozen-lockfile --prod=true

# Expose port
EXPOSE 3001

# Start the app
CMD [ "pnpm", "run", "start" ]
