import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// For build visiblity of Reviews.js (ensures inclusion if tree-shaking purges unused)
import Reviews from "./Reviews";
import { AuthProvider } from "./AuthContext";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
