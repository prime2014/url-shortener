import { Test } from "@nestjs/testing"
import { AppModule } from "../src/app.module"
import { HttpStatus, INestApplication, ValidationPipe } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service";
import * as pactum from "pactum";
import { SignupDto, LoginDto } from "src/users/dto/user.dto";

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

    
  })

  afterAll(async ()=>{
    app.close()
    await prisma.cleanDb()
  })

 

  describe("users testing", ()=>{
    describe("Should sign up", ()=>{
      const dto: SignupDto = {
        email: "testuser@testemail.com",
        password: "password",
        firstname: "Test",
        lastname: "User"
      }

      const errordto: SignupDto = {
        email: "testusertestemail",
        password: "password",
        firstname: "Test",
        lastname: "User"
      }
      it("Should sign a user up returning 201", ()=>{
        return pactum.spec().post("http://localhost:3333/users/api/v1/signup").withBody(dto).expectStatus(201)
      })

      it("Should not allow duplicate emails", ()=>{
        return pactum.spec().post("http://localhost:3333/users/api/v1/signup").withBody(dto).expectStatus(403)
          .expectBody({
            "message": "The email has already been taken",
            "error": "Forbidden",
            "statusCode": 403
          })
      })

      it("should throw an error on signup", ()=>{
        return pactum.spec().post("http://localhost:3333/users/api/v1/signup").withBody(errordto).expectStatus(400)
      })

      it("should error out with bad request if missing values", ()=>{
        return pactum.spec().post("http://localhost:3333/users/api/v1/signup").withBody({
          email:"",
          password: "",
          firstname: "Single",
          lastname: "User"
        }).expectStatus(400).expectBody({
          "message": [
            "email must be an email",
            "email should not be empty",
            "password should not be empty"
          ],
          "error": "Bad Request",
          "statusCode": 400
          }
        )
      })
    })

    describe("signin user", ()=>{
      it("should signin user and return 200", ()=>{
          let user: LoginDto = {
            email: "testuser@testemail.com",
            password: "password"
          }

          return pactum.spec().post("http://localhost:3333/users/api/v1/signin").withBody(user).expectStatus(HttpStatus.OK)
                
      })

      it("should return FORBIDDEN if login with nonexistant credentials", ()=>{
        let user = {
          email:"doesnotexist@nothing.com",
          password: "mypassword"
        }

        return pactum.spec().post("http://localhost:3333/users/api/v1/signin").withBody(user).expectBody({
          "message": "Invalid Credentials!",
          "error": "Forbidden",
          "statusCode": 403
        }).expectStatus(HttpStatus.FORBIDDEN)
      })
  })

  
})

})
