FROM node:18.18.0


WORKDIR /url-shortener

COPY ./package.json /url-shortener/

RUN npm install -g npm@10.2.4

RUN useradd -ms /bin/bash 1000

USER 1000

COPY --chown=1000:1000 . /url-shortener/