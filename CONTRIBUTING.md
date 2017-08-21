# Contributing to `memfs`

To get started, download the project to your machine:

    git clone https://github.com/streamich/memfs

Install dependencies:

    cd memfs
    npm install

Also, you probably want to use the latest Node.js version and `ts-node`
to be able to run TypeScript files:

    npm install -g ts-node

While developing your feature you can create a demo file and place it
in `demo/feature.ts`, run it like this:

    ts-node demo/feature.ts

Don't forget to write unit tests for you feature, test files have `.test.ts`
extension.

Run tests using this command:

    npm run test-basic-ts

Also make sure that your test cases have your new code well, run coverage report
using this command:

    npm run test-coverage-ts

When done, build the project and submit a pull request:

    npm run build

