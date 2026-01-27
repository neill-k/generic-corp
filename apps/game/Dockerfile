# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/game/package.json ./apps/game/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/game ./apps/game
COPY packages/shared ./packages/shared

# Build the application
WORKDIR /app/apps/game
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/apps/game/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/game/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
