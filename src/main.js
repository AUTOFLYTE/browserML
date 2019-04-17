import Vue from 'vue';
import App from './App.vue';
import HighCharts from 'highcharts';
import HighChartsMore from 'highcharts/highcharts-more';
import BootstrapVue from 'bootstrap-vue';
import HighchartsVue from 'highcharts-vue';
import './assets/local.scss';

import devtools from '@vue/devtools';

// Load the extra chart options
HighChartsMore(HighCharts);

Vue.config.productionTip = false;
Vue.use(BootstrapVue);
Vue.use(HighchartsVue);
new Vue({
	render: (h) => h(App)
}).$mount('#app');
/* global process */
/*
 * To get devtools working (from terminal):
 * sudo npm install -g @vue/devtools
 * IF THAT DOES NOT WORK
 * sudo npm install -g @vue/devtools --unsafe-perm=true --allow-root
 *
 * Then from terminal
 * 'vue-devtools'
 */
if (process.env.NODE_ENV === 'development') {
	devtools.connect(/* host, port */);
}
