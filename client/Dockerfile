# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy root monorepo config
COPY package.json ./
COPY client/package.json ./client/

# Install dependencies
RUN npm install --workspace=client

# Copy client source code
COPY client/ ./client/

# Build Vite PWA app
WORKDIR /app/client
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
