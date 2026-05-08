import React from 'react';
import type { ReactNode } from 'react';
import styles from './AppLayoutHs.module.css';
import {Outlet} from "react-router-dom"
import Header from '@/shared/layout/Header';
import Sidebar from '@/shared/layout/Sidebar';

export interface IAppLayoutHsProps {
  children?: ReactNode;
  title: string;
}

const AppLayoutHs: React.FC<IAppLayoutHsProps> = ({ children, title }) => {
  return (
    <div>
      <Header title={title} />
      <div className={styles.belowHeadbar}>
        <Sidebar />
        <Outlet />
        {children}
      </div>
    </div>
  );
};

export default AppLayoutHs;