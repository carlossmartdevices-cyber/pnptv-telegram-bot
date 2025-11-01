const { describe, it, beforeEach } = require('mocha');
const { expect } = require('chai');
const { getTelegramPermissions, isMessageTypeAllowed } = require('../src/utils/permissions');

describe('Permissions Utils', () => {
  describe('getTelegramPermissions', () => {
    it('should return restricted permissions for Free tier', () => {
      const permissions = getTelegramPermissions('Free');
      
      expect(permissions.can_send_messages).to.be.true;
      expect(permissions.can_send_photos).to.be.false;
      expect(permissions.can_send_videos).to.be.false;
      expect(permissions.can_send_documents).to.be.false;
    });

    it('should return full permissions for trial-week tier', () => {
      const permissions = getTelegramPermissions('trial-week');
      
      expect(permissions.can_send_messages).to.be.true;
      expect(permissions.can_send_photos).to.be.true;
      expect(permissions.can_send_videos).to.be.true;
      expect(permissions.can_send_documents).to.be.true;
    });

    it('should return full permissions for pnp-member tier', () => {
      const permissions = getTelegramPermissions('pnp-member');
      
      expect(permissions.can_send_messages).to.be.true;
      expect(permissions.can_send_photos).to.be.true;
      expect(permissions.can_send_videos).to.be.true;
      expect(permissions.can_send_documents).to.be.true;
    });
  });

  describe('isMessageTypeAllowed', () => {
    it('should allow text messages for Free tier', () => {
      expect(isMessageTypeAllowed('Free', 'text')).to.be.true;
    });

    it('should not allow media messages for Free tier', () => {
      expect(isMessageTypeAllowed('Free', 'photo')).to.be.false;
      expect(isMessageTypeAllowed('Free', 'video')).to.be.false;
      expect(isMessageTypeAllowed('Free', 'document')).to.be.false;
    });

    it('should allow all message types for premium tiers', () => {
      expect(isMessageTypeAllowed('trial-week', 'photo')).to.be.true;
      expect(isMessageTypeAllowed('pnp-member', 'video')).to.be.true;
      expect(isMessageTypeAllowed('crystal-member', 'document')).to.be.true;
    });
  });
});