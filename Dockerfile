FROM node:lts-slim as builder

LABEL version="1.0.0"
LABEL description="Check fines from csgt.vn"
LABEL maintainer="ThuyLe <thuykaka.uit@gmail.com>"

WORKDIR /app

COPY package.json /app
COPY yarn.lock /app

RUN yarn install

COPY . /app


CMD ["node", "./src/index.js"]