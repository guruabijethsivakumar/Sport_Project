# Stage 1: Build React Vite SPA
FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy root workspace manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/

# Install workspace dependencies (excluding apps/mobile)
RUN npm ci --workspace packages/shared --workspace apps/web --include-workspace-root

# Copy sources for shared package and web app
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build arguments for Vite environment
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_FEATURE_RECOMMENDATIONS_MODE=live
ARG VITE_FEATURE_TEAMS_MODE=live
ARG VITE_FEATURE_RESULTS_MODE=live
ARG VITE_FEATURE_NOTIFICATIONS_MODE=live
ARG VITE_FEATURE_RELIABILITY_MODE=live
ARG VITE_GOOGLE_CLIENT_ID=

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FEATURE_RECOMMENDATIONS_MODE=$VITE_FEATURE_RECOMMENDATIONS_MODE
ENV VITE_FEATURE_TEAMS_MODE=$VITE_FEATURE_TEAMS_MODE
ENV VITE_FEATURE_RESULTS_MODE=$VITE_FEATURE_RESULTS_MODE
ENV VITE_FEATURE_NOTIFICATIONS_MODE=$VITE_FEATURE_NOTIFICATIONS_MODE
ENV VITE_FEATURE_RELIABILITY_MODE=$VITE_FEATURE_RELIABILITY_MODE
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build static production bundle
RUN npm --prefix apps/web run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
