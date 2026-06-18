if (typeof Promise.try !== 'function') {
  Promise.try = function(fn) {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn());
      } catch (err) {
        reject(err);
      }
    });
  };
}
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
