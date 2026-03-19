FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# API URL will be resolved at runtime via window.location
# Set a placeholder so Next.js build doesn't inline empty string
ARG NEXT_PUBLIC_API_URL=http://localhost:9001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
ENV PORT=9000
EXPOSE 9000
CMD ["npm", "start"]
