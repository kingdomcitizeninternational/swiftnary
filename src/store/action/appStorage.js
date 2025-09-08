export const FORCEUSERIN = "FORCEUSERIN";
export const CREATE_PASSCODE = "CREATED_PASSCODE";
export const LOGIN = 'LOGIN';
export const CHANGE_BLACK = 'CHANGE_BLACK';
export const CHANGE_WHITE = 'CHANGE_WHITE';
export const OPEN_WALLET = 'OPEN_WALLET';
export const CHANGE_WALLET = 'CHANGE_WALLET';
export const NEW_TRANSACTION = 'NEW_TRANSACTION';
export const LOGOUT = 'LOGOUT';
export const UPDATE_USER = 'UPDATE_USER';
import { ethers } from 'ethers';



const DB_NAME = 'DexvaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

// Open IndexedDB and create object store if needed
const openDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

// Generic helper to perform a transaction and get the store
const withStore = async (mode, callback) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, mode);
  const store = tx.objectStore(STORE_NAME);
  const result = await callback(store);
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(result);
    tx.onerror = () => rej(tx.error);
  });
};

// Get value by key
const idbGet = async (key) =>
  withStore('readonly', (store) =>
    new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })
  );

// Set value by key
const idbSet = async (key, value) =>
  withStore('readwrite', (store) =>
    new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    })
  );

// Remove value by key
const idbRemove = async (key) =>
  withStore('readwrite', (store) =>
    new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    })
  );

// Calculate time remaining for token expiration
const calculateRemainingTime = (expirationTimestamp) => {
  const currentTime = Date.now();
  return Math.max(expirationTimestamp - currentTime, 0);
};

// Retrieve stored token and expiration, clean if expired
const retrievedAdminStoredToken = async () => {
  const token = await idbGet('token');
  const expiry = await idbGet('expiry');

  if (!token || !expiry) return { token: '', expiresIn: '' };

  const timeLeft = calculateRemainingTime(Number(expiry));
  if (timeLeft <= 0) {
    await Promise.all([
      idbRemove('token'),
      idbRemove('expiry'),
      idbRemove('user'),
    ]);
    return { token: '', expiresIn: '' };
  }

  return { token, expiresIn: timeLeft };
};

// Get theme style by color string
const getTheme = (style) => ({
  background: style === 'white' ? 'white' : 'black',
  importantText: style === 'white' ? 'black' : 'white',
  normalText: '#5d616d',
  fadeColor: style === 'white' ? 'rgb(240,240,240)' : 'rgb(30,30,30)',
  blue: 'rgb(37, 99, 235)',
  fadeButtonColor: style === 'white' ? 'rgb(200,200,200)' : 'rgb(30,30,30)',
});

// Main login check action
export const checkIfIsLoggedIn = () => async (dispatch) => {

  const backgroundColorStyle = await idbGet('@backgroundColorStyle');
  dispatch({
    type: backgroundColorStyle === 'white' ? CHANGE_WHITE : CHANGE_BLACK,
    payload: getTheme(backgroundColorStyle || 'black'),
  });

  try {
    const { token, expiresIn } = await retrievedAdminStoredToken();
    if (!token) return {
      bool: false, message: 'no token'
    };

    const userId = await idbGet('userId');
    if (!userId) return { bool: false, message: 'no stored user' };

    //https://backend.swiftnary.net
    //https://backend.swiftnary.net

    const response = await fetch(`https://backend.swiftnary.net/userbytoken`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        header: token,
      },
    });

    if (response.status !== 200) {

      const data = await response.json();
    }

    if (response.status === 200) {
      const data = await response.json();
      await idbSet('userId', data.response.user._id);


      const res = {
        user: data.response.user,
        admin: data.response.admin,
        transactions: data.response.transactions,
        investment: data.response.investments,
        token,
        expiresIn,
      };



      // Calculate expiration timestamp
      const expirationTimestamp = new Date().getTime() + res.expiresIn * 60 * 60 * 1000;

      // Store in IndexedDB instead of localStorage
      await idbSet('token', res.token);
      await idbSet('userId', res.user._id);
      await idbSet('expiry', expirationTimestamp.toString());

      console.log(res)
      dispatch({ type: FORCEUSERIN, payload: res });




      return { bool: true, message: res };
    }
    const errorData = await response.json();
    return { bool: false, message: errorData.response };
  } catch (err) {
    return { bool: false, message: err.message };
  }
};


//login handler
export const login = (data) => {
  return async (dispatch, getState) => {
    try {
      let response = await fetch('https://backend.swiftnary.net/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      //error
      if (response.status === 422 || response.status === 500 || response.status === 300) {
        let data = await response.json();

        return { bool: false, message: data.response };
      }

      if (response.status === 404) {
        let data = await response.json();

        return { bool: false, message: data.response, url: 'signup' };
      }



      if (response.status === 202) {
        return { bool: true, url: 'verification' };
      }
      //to dashboard
      if (response.status === 200) {
        let data = await response.json();
        const { token, user, expiresIn } = data.response;

        // Calculate expiration timestamp
        const expirationTimestamp = new Date().getTime() + expiresIn * 60 * 60 * 1000;

        // Store in IndexedDB instead of localStorage
        await idbSet('token', token);
        await idbSet('userId', user._id);
        await idbSet('expiry', expirationTimestamp.toString());
        // Dispatch login
        dispatch({ type: LOGIN, payload: data.response });


        return { bool: true, url: 'invest' };
      }
    } catch (err) {
      return { bool: false, message: err.message };
    }
  };
};


export const signup = (data) => {
  return async (dispatch, getState) => {
    try {
      let response = await fetch('https://backend.swiftnary.net/signup', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.status === 422 || response.status === 500 || response.status === 300) {
        let data = await response.json();
        return { bool: false, message: data.response };
      }

      if (response.status === 303) {
        let data = await response.json();
        return { bool: false, message: data.response, url: 'login' };
      }

      if (response.status === 200) {
        return { bool: true, url: 'verification' };
      }
    } catch (err) {
      return { bool: false, message: err.message };
    }
  };
};




export const verifyEmail = (data) => {
  return async (dispatch, getState) => {
    try {
      let response = await fetch('https://backend.swiftnary.net/verifyemail', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });

      const dataResponse = await response.json();

      if ([300, 400, 404, 500].includes(response.status)) {
        console.log(dataResponse)
        return {
          bool: false,
          message: dataResponse.response.message,
        };
      }

      if (response.status === 200) {
        const { token, user, expiresIn } = dataResponse.response;

        // Calculate expiration timestamp
        const expirationTimestamp = new Date().getTime() + expiresIn * 60 * 60 * 1000;

        // Store in IndexedDB instead of localStorage
        await idbSet('token', token);
        await idbSet('userId', user._id);
        await idbSet('expiry', expirationTimestamp.toString());

        // Dispatch login
        dispatch({ type: LOGIN, payload: dataResponse.response });

        return {
          bool: true,
          message: dataResponse.response,
        };
      }

    } catch (err) {
      return {
        bool: false,
        message: err.message,
      };
    }
  };
};






export const registeration = (data) => {
  return async (dispatch, getState) => {
    //do some check on the server if its actually login before proceding to dispatch
    try {
      let {
        user
      } = getState().userAuth

      data = { ...data, email: user.email }

      const response = await fetch(`https://backend.swiftnary.net/registeration`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify(data),

      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
          url: '/registeration'
        }
      }


      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
          url: '/registeration'
        }
      }


      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
          url: '/profile'
        }
      }

    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}

export const profilePhoto = (data) => {
  return async (dispatch, getState) => {
    //do some check on the server if its actually login before proceding to dispatch
    try {
      let {
        user
      } = getState().userAuth

      data = { ...data, email: user.email }

      const response = await fetch(`https://backend.swiftnary.net/pofilephoto`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify(data),

      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
          url: '/profilephoto'
        }
      }


      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
          url: '/profilephoto'
        }
      }

      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
          url: '/wallet'
        }
      }

    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}



//fetch trades for this account
export const fetchTrade = (user) => {
  return async (dispatch, getState) => {
    try {
      let response = await fetch('https://backend.swiftnary.net/tradess', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: user
        })
      })
      if (response.status === 300) {
        let data = await response.json()
        console.log(data)

        return {
          bool: false,
          message: data.response,
        }
      }
      if (response.status === 200) {
        let data = await response.json()
        // dispatch new transactions

        return {
          bool: true,
          message: data.response,
        }
      }
    } catch (err) {
      console.log(err)
      return {
        bool: false,
        message: err.message,
      }
    }

  }


}



export const changeCurrency = (data) => {
  return async (dispatch, getState) => {
    try {
      let response = await fetch('https://backend.swiftnary.net/changecurrency', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      })
      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }
      if (response.status === 200) {
        let data = await response.json()
        //dispatch a new user change
        dispatch({ type: UPDATE_USER, payload: data.response })
        return {
          bool: true,
          message: data.message,
        }
      }
    } catch (err) {
      return {
        bool: false,
        message: err.message,
      }
    }

  }
}



export const createDeposit = (data) => {
  return async (dispatch, getState) => {
    //do some check on the server if its actually login before proceding to dispatch
    try {

      const response = await fetch(`https://backend.swiftnary.net/createdeposit`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify(data),

      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }


      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }
    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}



export const fetchDeposit = (data) => {
  return async (dispatch, getState) => {
    //do some check on the server if its actually login before proceding to dispatch
    try {
      const response = await fetch(`https://backend.swiftnary.net/fetchdeposit`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify(data),

      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }


      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }


      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }

    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}



export const fetchWithdraw = (data) => {
  return async (dispatch, getState) => {
    //do some check on the server if its actually login before proceding to dispatch
    try {
      const response = await fetch(`https://backend.swiftnary.net/fetchwithdraw`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify(data),

      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }


      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }


      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }

    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}


export const createWithdraw = (data) => {
  return async (dispatch, getState) => {
    //do some check on the server if its actually login before proceding to dispatch
    try {
      const response = await fetch(`https://backend.swiftnary.net/createwithdraw`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify(data),
      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }
      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }
    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}

//define a  function that fetches investment packages
export const fetchPackages = (data) => {
  return async (dispatch, getState) => {
    try {
      const response = await fetch(`https://backend.swiftnary.net/packages`, {
        headers: {
          "Content-Type": "application/json",
        }
      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }
    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}

export const fetchInvestment = (id) => {
  return async (dispatch, getState) => {
    try {
      const response = await fetch(`https://backend.swiftnary.net/investment/${id}`, {
        headers: {
          "Content-Type": "application/json",
        }
      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }
    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}

//https://backend.swiftnary.net
// actions/depositActions.js

export const fetchDepositHandler = (userId) => {
  return async (dispatch, getState) => {
    try {
      const response = await fetch(`https://backend.swiftnary.net/fetch-handlers/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }
      if (response.status === 500) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }
    } catch (error) {
     

      return {
        bool: false,
        message: error.message,
      };
    }
  };
};

export const  createPay = (data) => {
  return async (dispatch, getState) => {
    //do some check on the server if its actually login before proceding to dispatch
    try {
      const response = await fetch(`https://backend.swiftnary.net/createpay`, {
        headers: {
          "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify(data),
      })

      if (response.status === 404) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }
      if (response.status === 300) {
        let data = await response.json()
        return {
          bool: false,
          message: data.response,
        }
      }

      if (response.status === 200) {
        let data = await response.json()
        return {
          bool: true,
          message: data.response,
        }
      }
    } catch (err) {
      return {
        bool: false,
        message: "network error"
      }
    }
  }
}









export const logout = () => async (dispatch) => {
  try {
    await Promise.all([
      idbRemove('token'),
      idbRemove('userId'),
      idbRemove('expiry'),
      idbRemove('user'),
      idbRemove('seedphrase'),
      idbRemove('address'),
      idbRemove('chain'),
      idbRemove('network'),
    ]);

    dispatch({ type: LOGOUT });


  } catch (err) {
    return { bool: false, message: err.message };
  }
};




