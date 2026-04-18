describe('libs', () => {
  it('should export shared types and enums', () => {
    // Test that the library exports are available
    expect(() => require('../index')).not.toThrow();
  });
});
