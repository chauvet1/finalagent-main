# Multi-stage build for production-ready Node.js application
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]

# Development stage
FROM base AS development

# Switch back to root to install dev dependencies
USER root

# Install development dependencies
RUN npm ci && npm cache clean --force

# Switch back to nodejs user
USER nodejs

# Start with nodemon for development
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3003

# Final production image
FROM production AS final

# Add labels for better container management
LABEL maintainer="Agent System Team"
LABEL version="1.0.0"
LABEL description="Production-ready agent management system"

# Start the application
CMD ["node", "src/server.js"]
