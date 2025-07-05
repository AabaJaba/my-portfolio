// src/CosmicBackground.js
import React from 'react';
import './CosmicBackground.css';

const CosmicBackground = () => {
  // This component is currently just a div.
  // All the magic happens in the associated CSS file.
  // Later, this component could be where our three.js canvas is initialized.
  return <div className="cosmic-background"></div>;
};

export default CosmicBackground;