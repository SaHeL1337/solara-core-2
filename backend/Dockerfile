FROM node:22.22.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install -g npm@11.8.0
RUN npm install

# Generate Prisma client before copying the rest of the code
# This ensures it's available for type checking if needed during build
# Though here we use ts-node at runtime
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]
