import { Test } from "@nestjs/testing"
import { AppModule } from "src/app.module"
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as pactum from "pactum";


describe("App e2e", ()=>{
  let app : INestApplication
  let prisma: PrismaService
  beforeAll(async ()=>{
    const moduleRef = Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = (await moduleRef).createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      })
    )
    await app.init()
    await app.listen(3333);

    prisma = app.get(PrismaService)

    await prisma.cleanDb()
  })

  afterAll(()=>{
    app.close()
  })

  describe("Auth", ()=>{
    describe("set key", ()=>{
      it("should create key", ()=>{
        return pactum.spec().post("http://localhost:3333/auth/set/key")
      })
    })
  })
})