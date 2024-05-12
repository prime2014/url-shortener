let { Base62Converter, generateHexUuid } = require("./main")

// console.log(generateHexUuid())

async function* generateBase62Strings(maxIterations) {
    const base62Converter = new Base62Converter();

    for (let i = 0; i < maxIterations; i++) {
        const base62String = await base62Converter.getBase62Parallel();
        yield base62String;
    }
}

async function testBase62Collision(maxIterations) {
    const generatedStrings = new Set();
    let collisionDetected = false;

    for await (let base62String of generateBase62Strings(maxIterations)) {
        if (generatedStrings.has(base62String)) {
            collisionDetected = true;
            console.log(`Collision detected after ${generatedStrings.size + 1} iterations.`);
            break;
        }
        // console.log(base62String)
        generatedStrings.add(base62String);
    }

    if (!collisionDetected) {
        console.log(`No collision detected after ${maxIterations} iterations.`);
    }
}

// Example usage: test Base62 string generation with a maximum of 100000 iterations
testBase62Collision(50000000);