import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Settings.module.css';
import {
  FaLock, FaFingerprint, FaShieldAlt, FaClock, FaSearchLocation,
  FaSun, FaLanguage, FaDollarSign, FaBell,
} from 'react-icons/fa';
import DesktopSideBar from '../components/DesktopSideBar';
import BackHeader from '../components/DashboardHeader';
import CurrencyModal from '../Modal/CurrencyModal';
import { useSelector } from 'react-redux';
import AuthModal from '../Modal/AuthModal';
import Sidebar from '../components/MobileSideBar';

const Settings = () => {

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openCurrencyModal, setOpenCurrencyModal] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);
  const [authInfo, setAuthInfo] = useState("");


  const updateAuthError = () => {
    setIsAuthError(prev => !prev);
    setAuthInfo('')
  }


  const navigate = useNavigate();

  
  const navigateHandler = () => navigate(-1);
  const openCurrencyModalHandler = () => setOpenCurrencyModal(true)
  let { user} = useSelector(state => state.userAuth)




  const hideCurrencyModal = () => {
    setOpenCurrencyModal(false)
  }

  const navigateMobileHandler = (url) => {
    return navigate(`/${url}`)
  };

  
  const openMobileMenu = () => {
    setSidebarOpen(prev => !prev)
}


const notificationHandler = () => {
    navigate('/notifications')
}



  return (
    <>
      {openCurrencyModal && <CurrencyModal hideModal={hideCurrencyModal} />}

      {isAuthError && <AuthModal modalVisible={isAuthError} updateVisibility={updateAuthError} message={authInfo} />}

      <div className={styles.dashboard}>
        <div className={styles.leftSection}>
          <DesktopSideBar navigateMobileHandler={navigateMobileHandler} />
        </div>
          {/*  sidebar content */}
          {sidebarOpen && (
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isInvest={true} navigateMobileHandler={navigateMobileHandler} />
                )}

        <div className={styles.mainSection}>
          {/* ✅ Use BackHeader here */}
          <BackHeader
             openMobileMenu={openMobileMenu}
             notificationHandler={notificationHandler}
             sidebarOpen={sidebarOpen}
            title='Settings'
          />

          <div className={styles.dashboardContent}>
            <div className={styles.dashboardContentleft}>

              {/* SECURITY */}
              <div className={styles.settingsSection}>
                <h3 className={styles.settingsTitle}>Security</h3>

                <div className={styles.settingsItem}><FaLock className={styles.icon} /> Change PIN</div>
              


                <div className={styles.settingsItem}>
                  <FaClock className={styles.icon} /> Auto-Lock
                  <span className={styles.settingRight}>1 minute</span>
                </div>
              </div>

             

              {/* NOTIFICATIONS */}
              <div className={styles.settingsSection}>
                <h3 className={styles.settingsTitle}>Notifications</h3>
                <div className={styles.settingsItem}>
                  <FaSun className={styles.icon} /> Theme
                  <span className={styles.settingRight}>Light</span>
                </div>
                <div className={styles.settingsItem}>
                  <FaLanguage className={styles.icon} /> Language
                  <span className={styles.settingRight}>English</span>
                </div>
                <div className={styles.settingsItem} onClick={openCurrencyModalHandler}>
                  <FaDollarSign className={styles.icon} /> Currency
                  <span className={styles.settingRight}>{user.currency ? user.currency : 'USD'}</span>
                </div>
                

              </div>

            </div>
            <div className={styles.dashboardContentright}></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
