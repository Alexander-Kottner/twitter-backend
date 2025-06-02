import 'reflect-metadata'

// Store original console methods
const originalConsole = {
  warn: console.warn,
  error: console.error
}

// Mock console methods for tests to reduce noise in test output
// Set SHOW_CONSOLE_OUTPUT=true environment variable to see the actual logs
if (!process.env.SHOW_CONSOLE_OUTPUT) {
  console.warn = jest.fn()
  console.error = jest.fn()
}

// Restore console methods after all tests
afterAll(() => {
  console.warn = originalConsole.warn
  console.error = originalConsole.error
})