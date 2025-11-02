// src/__tests__/Button.test.jsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // optional here if already in setupTests
import Button from '../components/Button';

test('renders the button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});

