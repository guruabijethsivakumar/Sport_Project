import React, { useState } from 'react';
import { NotificationBell } from '../notifications/NotificationBell';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { useAuth } from '../../auth/AuthContext';

/**
 * Named slot in the Navbar reserved for Dev 3's real-time notification bell and drawer.
 */
export function NavbarNotificationSlot(): React.ReactElement | null {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <>
      <NotificationBell isOpen={isOpen} onClick={() => setIsOpen((prev) => !prev)} />
      <NotificationDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
