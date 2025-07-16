import React from 'react';
import { Link } from 'react-router-dom';
import styles from './AboutPage.module.css';

const AboutPage = () => {
  return (
    <div className={styles.aboutPageBody}>
      <div className={styles.backgroundGrid}></div>

      <div className={styles.aboutContainer}>
        <Link to="/" className={styles.closeButton} aria-label="Back to Portfolio">×</Link>

        <header className={styles.aboutHeader}>
          <div className={styles.profilePhotoContainer}>
            <img src="/profile.jpg" alt="Your Name" className={styles.profilePhoto} />
            <div className={`${styles.ring} ${styles.ring1}`}></div>
            <div className={`${styles.ring} ${styles.ring2}`}></div>
          </div>
          <div className={styles.headerText}>
            <h1>Your Name</h1>
            <h2>Creative Technologist & Digital Artist</h2>
          </div>
        </header>

        <section className={styles.aboutBio}>
          <h3>Mission Statement</h3>
          <p>I build immersive digital experiences that bridge the gap between art and technology. My passion lies in creating interactive narratives and procedural art, transforming complex data into beautiful, intuitive visuals.</p>
        </section>

        <section className={styles.aboutSkills}>
          <h3>Core Competencies</h3>
          <div className={styles.skillGroups}>
            {/* Skill Group: Design */}
            <div className={styles.skillGroup}>
              <span className={`${styles.skillIcon} ${styles.design}`}></span>
              <h4>Design</h4>
              <ul>
                <li>UI/UX Prototyping</li>
                <li>Brand Identity</li>
                <li>Motion Graphics</li>
              </ul>
            </div>
            {/* Skill Group: Development */}
            <div className={styles.skillGroup}>
              <span className={`${styles.skillIcon} ${styles.development}`}></span>
              <h4>Development</h4>
              <ul>
                <li>Three.js & WebGL</li>
                <li>React & JavaScript</li>
                <li>D3.js & Data Viz</li>
              </ul>
            </div>
            {/* Skill Group: Video */}
            <div className={styles.skillGroup}>
              <span className={`${styles.skillIcon} ${styles.video}`}></span>
              <h4>Video</h4>
              <ul>
                <li>Editing & Post-Production</li>
                <li>Color Grading</li>
                <li>VFX Compositing</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className={styles.aboutFooter}>
          <a href="/resume.pdf" className={styles.ctaButton} download>Download Resume</a>
          <div className={styles.socialLinks}>
            <a href="#" aria-label="GitHub">GH</a>
            <a href="#" aria-label="LinkedIn">IN</a>
            <a href="#" aria-label="Vimeo">VM</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AboutPage;