import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// For build visiblity of Reviews.js (ensures inclusion if tree-shaking purges unused)
import Reviews from "./Reviews";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
