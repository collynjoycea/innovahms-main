import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

const menuSections = [
    // ... dashboard, reservations, check-in / out
    {
      title: "ROOM MANAGEMENT",
      items: [
        { name: "Room Map & Assign", path: "/staff/room-map", icon: <Map /> },
        // DAPAT ay "/staff/extend-stay" para mag-match sa App.js
        { name: "Extend / Transfer", path: "/staff/extend-stay", icon: <ArrowLeftRight /> }
      ]
    },
    {
      title: "GUEST CRM",
      items: [
        // DAPAT ay "/staff/guest-profiles" para mag-match sa App.js
        { name: "Guest Profiles", path: "/staff/guest-profiles", icon: <Users /> },
        { name: "Loyalty & Points", path: "/staff/loyalty", icon: <Crown /> }
      ]
    }
  ];