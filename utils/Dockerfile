FROM node:18.18.0


WORKDIR /url-shortener

COPY ./package.json /url-shortener/

USER 0

RUN npm install


COPY --chown=1000:1000 . /url-shortener/