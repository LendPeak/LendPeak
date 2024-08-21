module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[t]s?(x)'], // Looks for test files with .test.ts or .spec.ts extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@calculators/(.*)$': '<rootDir>/calculators/$1',
    '^@core/(.*)$': '<rootDir>/core/$1'
  },

};