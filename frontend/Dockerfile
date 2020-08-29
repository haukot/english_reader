FROM node:12.18.3

EXPOSE 8888
ENV PORT 8888

ADD . /srv/frontend
WORKDIR /srv/frontend

COPY . .

RUN yarn

CMD ["yarn", "start"]