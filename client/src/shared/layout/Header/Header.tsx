import React from 'react';
import styles from './Header.module.css';
import logo from '@/assets/images/TechMahindraLogo.png';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <img src={logo} className={styles.logo} />
        <span className={styles.title}>{title}</span>
      </div>
    </header>
  );
};

export default Header;