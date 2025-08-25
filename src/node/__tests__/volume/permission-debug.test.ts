import { create } from '../../../__tests__/util';

describe('permission debugging', () => {
  it('debug permission check for readonly file', () => {
    // Arrange
    const vol = create({
      '/test.txt': 'content',
    });

    console.log('Initial file stats:', vol.statSync('/test.txt'));
    console.log('Initial file mode:', vol.statSync('/test.txt').mode.toString(8));
    
    vol.chmodSync('/test.txt', 0o400);
    
    console.log('After chmod 0o400 stats:', vol.statSync('/test.txt'));
    console.log('After chmod mode:', vol.statSync('/test.txt').mode.toString(8));
    console.log('Perm bits:', (vol.statSync('/test.txt').mode & ~0o170000).toString(8));
    
    // Try to see what process uid/gid are
    console.log('Process getuid:', process.getuid ? process.getuid() : 'undefined');
    console.log('Process getgid:', process.getgid ? process.getgid() : 'undefined');
    
    // Let's see the internal node
    const core = (vol as any)._core;
    const linkOrNode = core.getLink ? core.getLink('/test.txt') : core.root.getChild('test.txt');
    const node = linkOrNode.getNode ? linkOrNode.getNode() : linkOrNode.node;
    console.log('Node uid:', node.uid);
    console.log('Node gid:', node.gid);
    console.log('Node perm:', node.perm.toString(8));
    console.log('Node.canRead():', node.canRead());
    console.log('Node.canWrite():', node.canWrite());
    
    // This should not throw
    expect(() => vol.readFileSync('/test.txt')).not.toThrow();
  });
});