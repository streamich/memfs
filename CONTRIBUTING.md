# Contributing to `memfs`

To get started, download the project to your machine:

    git clone https://github.com/streamich/memfs
    cd memfs

Start from the `develop` branch:

    git checkout develop
    git checkout -b your-feature

Install dependencies:

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

    npm run test-coverage-ts

Also make sure that your test cases cover your new code well.

When done, build the project:

    npm run build

Submit a pull request into the `develop` branch.
