export default {
  displayName: 'backend-integration',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  testMatch: ['**/*.integration.spec.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(jose|uuid|@react-email)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/backend-integration',
};
