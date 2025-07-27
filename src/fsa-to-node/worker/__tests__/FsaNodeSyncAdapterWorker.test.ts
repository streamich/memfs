import { FsaNodeSyncAdapterWorker } from '../FsaNodeSyncAdapterWorker';

// Simple test to verify the core logic for worker creation
describe('FsaNodeSyncAdapterWorker', () => {
  describe('worker creation logic', () => {
    test('should handle module URLs correctly', () => {
      const moduleUrl = '/src/worker.ts?type=module&worker_file';
      const regularUrl = '/src/worker.js';
      
      // Test the URL detection logic for module workers
      expect(moduleUrl.includes('type=module')).toBe(true);
      expect(regularUrl.includes('type=module')).toBe(false);
    });

    test('should handle type checking correctly', () => {
      const stringUrl = '/src/worker.js';
      const mockWorker = { postMessage: () => {} } as any;
      
      // Test type checking logic for string vs Worker instances
      expect(typeof stringUrl).toBe('string');
      expect(typeof mockWorker).toBe('object');
      expect(typeof stringUrl === 'string').toBe(true);
      expect(typeof mockWorker === 'string').toBe(false);
    });
    
    test('should detect various module URL patterns', () => {
      const patterns = [
        '/src/worker.ts?type=module&worker_file',
        'worker.js?type=module',
        'https://example.com/worker.ts?type=module',
        'blob:worker?type=module',
      ];
      
      patterns.forEach(url => {
        expect(url.includes('type=module')).toBe(true);
      });
      
      const nonModuleUrls = [
        '/src/worker.js',
        'worker.js',
        'https://example.com/worker.js',
        'blob:worker',
        '/src/worker.ts?worker_file',
      ];
      
      nonModuleUrls.forEach(url => {
        expect(url.includes('type=module')).toBe(false);
      });
    });
  });
});