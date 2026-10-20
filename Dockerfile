FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir -p /data && chown node:node /data
COPY public ./public
COPY server ./server
USER node
VOLUME /data
EXPOSE 3000
CMD ["npm", "start"]
