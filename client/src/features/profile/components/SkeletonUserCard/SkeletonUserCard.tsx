import React from 'react';
import cardStyles from '../UserCard/UserCard.module.css';
import styles from './SkeletonUserCard.module.css';

const ROWS = [65, 40, 75, 45, 60];

const SkeletonUserCard: React.FC = () => (
  <div className={cardStyles.profileCard}>
    <div className={cardStyles.avatarWrapper}>
      <div className={styles.avatarShimmer} />
    </div>

    <div className={cardStyles.profileInfo}>
      {ROWS.map((w, i) => (
        <div key={i} className={cardStyles.infoRow}>
          <div className={styles.line} style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>

    <div className={cardStyles.aboutMeSection}>
      <div className={styles.line} style={{ width: '30%', height: 10 }} />
      <div className={styles.line} style={{ width: '100%', marginTop: 8 }} />
      <div className={styles.line} style={{ width: '85%', marginTop: 6 }} />
      <div className={styles.line} style={{ width: '70%', marginTop: 6 }} />
    </div>
  </div>
);

export default SkeletonUserCard;
