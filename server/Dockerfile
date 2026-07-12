FROM node:22-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5050
CMD ["node", "src/index.js"]
