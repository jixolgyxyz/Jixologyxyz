import React from 'react';
import styles from './SkeletonAvatarTile.module.css';

const SkeletonAvatarTile: React.FC = () => (
  <div
    className="inv-tile"
    style={{ cursor: 'default', pointerEvents: 'none' }}
    aria-hidden="true"
  >
    <div className={styles.avatarShimmer} />
    <div className={styles.labelShimmer} />
  </div>
);

export default SkeletonAvatarTile;
