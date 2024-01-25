import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './exception.filter';
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as ejs from "ejs";
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from "cookie-parser";

const requestIp = require("request-ip")



process.on('uncaughtException', function (err) {
  console.log("Hi there")
  console.log(err.message, err.stack, err.name);
});

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = new DocumentBuilder()
              .setTitle("URL Shortener Service")
              .setDescription("An API Service used to generate shortened url links out of long ones")
              .setVersion("1.0")
              .addTag("url")
              .addServer("http://qr.isale.co.ke")
              // .addServer("http://localhost:3333")
              // .addServer("http://localhost:80")
              // .addServer("https://c33f-197-248-49-43.ngrok-free.app")
              
              .addBearerAuth()
              .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api", app, document)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  app.enableCors({origin: "*", methods:"POST"})
  app.use(cookieParser())
  // app.useGlobalFilters(new HttpExceptionFilter());
  app.use(requestIp.mw())

  // Configure EJS as the view engine
  app.engine('ejs', ejs.renderFile);
  app.setViewEngine('ejs');

  await app.listen(3333);
}
bootstrap();