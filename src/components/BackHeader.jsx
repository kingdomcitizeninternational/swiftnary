import React from 'react';
import { HiArrowLeft } from 'react-icons/hi';
import { FaBell, FaUser } from 'react-icons/fa';
import styles from './BackHeader.module.css'; // Make sure the CSS file path is correct

const BackHeader = ({ navigateHandler, openBuyModalFun, openSendModalFun,title }) => {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.mobileHeader}>
        <div className={styles.hamburger}>
          <HiArrowLeft color="black" size={25} onClick={navigateHandler} />
        </div>
        <h2>{title}</h2>
      </div>

      <div className={styles.title}>
        <h2></h2>
      </div>

      <div className={styles.buttonContainer}>
      
        <button className={styles.notificationbutton}>
          <FaBell color="black" size={18} />
          <span>55</span>
        </button>
        <button className={styles.imagebutton}>
          <FaUser color="black" size={18} />
        </button>
      </div>
    </div>
  );
};

export default BackHeader;
