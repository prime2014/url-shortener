FROM node:18.18.0


WORKDIR /url-shortener

COPY ./package.json /url-shortener/

USER 0

RUN npm install --target_arch=x64 --target_platform=linux

RUN useradd -ms /bin/bash 1000

USER 1000

COPY --chown=1000:1000 . /url-shortener/