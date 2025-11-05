export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/backend/**/*.test.js',
  ],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/server.js',
    '!backend/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.js'],
  verbose: true,
};

