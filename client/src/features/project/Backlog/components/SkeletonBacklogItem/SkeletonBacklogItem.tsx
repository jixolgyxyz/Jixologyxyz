import React from 'react';
import styles from './SkeletonBacklogItem.module.css';

const SkeletonBacklogItem: React.FC = () => (
  <div className={styles.row}>
    <div className={styles.iconCircle} />
    <div className={styles.code} />
    <div className={styles.title} />
    <div className={styles.badge} />
    <div className={styles.iconSquare} />
    <div className={styles.iconSquare} />
    <div className={styles.iconSquare} />
  </div>
);

export default SkeletonBacklogItem;
