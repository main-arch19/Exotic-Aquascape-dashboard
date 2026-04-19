'use client';
import { useState } from 'react';
export default function TestPage() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>JS Test</h1>
      <p>Count: <strong>{count}</strong></p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{ padding: '8px 16px', fontSize: 16, cursor: 'pointer' }}
      >
        Click me
      </button>
      <p style={{ marginTop: 16, color: count > 0 ? 'green' : 'gray' }}>
        {count > 0 ? 'JavaScript is working' : 'Click the button to test JS'}
      </p>
    </div>
  );
}
