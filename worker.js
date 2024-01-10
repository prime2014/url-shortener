"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// worker.ts
require("dotenv").config();
var amqp = require("amqplib/callback_api");
var sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
var queueUrl = process.env.RABBITMQ_QUEUE_URL;
var retry = 0;
function connectToRabbitMQ() {
    amqp.connect(queueUrl, function (error0, connection) {
        if (retry > 5)
            throw new Error("ERROR: Could not connect to RabbitMQ");
        if (error0) {
            console.error('Error connecting to RabbitMQ:', error0.message);
            retry += 1;
            setTimeout(connectToRabbitMQ, 5000); // Retry after 5 seconds
            return;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                console.error('Error creating RabbitMQ channel:', error1.message);
                connection.close();
                return;
            }
            // Declare an exchange (e.g., direct exchange)
            var exchange = 'direct_exchange';
            var exchangeType = 'direct';
            var queue = 'password_reset';
            channel.assertExchange(exchange, exchangeType, {
                durable: true,
            });
            channel.assertQueue(queue, {
                durable: true,
            });
            // Bind the queue to the exchange with a routing key
            var routingKey = 'password_routing_key';
            channel.bindQueue(queue, exchange, routingKey);
            console.log('Worker is waiting for messages.');
            // Move the consume logic outside the connectToRabbitMQ function
            consumeMessages(channel);
        });
    });
}
// Handle RabbitMQ connection closure
function handleConnectionClose(connection) {
    console.error('RabbitMQ connection closed.');
    setTimeout(function () {
        connectToRabbitMQ();
    }, 5000); // Retry after 5 seconds
}
process.once('SIGINT', function () {
    if (connection) {
        connection.close();
    }
});
// Move consume logic outside the connectToRabbitMQ function
function consumeMessages(channel) {
    channel.consume('password_reset', function (msg) {
        if (msg !== null) {
            var emailData = JSON.parse(msg.content.toString());
            sendEmail(emailData);
            channel.ack(msg); // Acknowledge the message
        }
    }, {
        noAck: false, // Set to false to manually acknowledge messages
    });
}
var connection;
// Connect to RabbitMQ
connectToRabbitMQ();
// Helper function for sleeping (delaying execution) in an asynchronous manner
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
        });
    });
}
function sendEmail(emailData) {
    return __awaiter(this, void 0, void 0, function () {
        var to, from, subject, html, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    to = emailData.to, from = emailData.from, subject = emailData.subject, html = emailData.html;
                    msg = {
                        to: to,
                        from: from,
                        subject: subject,
                        html: html,
                    };
                    return [4 /*yield*/, sgMail.send(msg)];
                case 1:
                    _a.sent();
                    console.log("Email sent to ".concat(to));
                    return [2 /*return*/];
            }
        });
    });
}
