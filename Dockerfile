# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL 1.1 compatibility for Prisma
RUN apk add --no-cache openssl1.1-compat

COPY . .

RUN npm install

RUN npx prisma generate --schema=prisma/schema.prisma

EXPOSE 5000
CMD ["npm", "run", "dev"] 