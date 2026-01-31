import React from 'react';
import Header from './Header';
import MainContent from './MainContent';
import './Layout.css';

function Layout() {
  return (
    <div className="layout">
      <Header />
      <div className="layout-body">
        <MainContent />
      </div>
    </div>
  );
}

export default Layout;
