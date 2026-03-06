module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // This is the leash. It tells Jest to completely ignore the rest of the project and only scan the electron folder.
  roots: ['<rootDir>/electron'], 
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};
