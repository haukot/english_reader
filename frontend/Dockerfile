FROM node:16.19.0

EXPOSE 8888
ENV PORT 8888

ADD . /srv/frontend
WORKDIR /srv/frontend

COPY . .

RUN yarn

CMD ["yarn", "start"]