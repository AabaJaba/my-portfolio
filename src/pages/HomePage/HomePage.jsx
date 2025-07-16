// /src/pages/HomePage/HomePage.jsx
import React, { useRef, useEffect } from 'react';
import { useWorld } from '../../hooks/useWorld';
import styles from './HomePage.module.css';

const HomePage = () => {
  const mountRef = useRef(null);

  // The custom hook handles all the Three.js logic
  useWorld(mountRef);
  
  // Ensure the body doesn't scroll while on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return <div className={styles.canvasContainer} ref={mountRef} />;
};

export default HomePage;