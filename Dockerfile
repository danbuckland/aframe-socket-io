FROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
# RUN yarn install
RUN yarn install --prod
COPY . .
# RUN yarn build:dev
RUN yarn build:prod
EXPOSE 2002
# CMD ["yarn", "serve"]
CMD ["yarn", "start"]