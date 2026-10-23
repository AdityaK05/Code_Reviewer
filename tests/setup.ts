import '@testing-library/jest-dom'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Electron Preload API
// @ts-ignore
global.window.codeReviewer = {
  native: {
    health: async () => ({
      success: true,
      requestId: 'test-req-123',
      payload: {
        engine: 'Code_Reviewer Native Engine',
        version: '0.1.0',
        platform: 'windows'
      }
    })
  }
}
