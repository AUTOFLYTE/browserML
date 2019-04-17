<template>
  <div id="app">
    <div class="container">
      <div>
        <b-row>
          <b-col cols="4">
            <b-form-group description="Select a dealer data file." label="Data File">
              <b-form-select v-model="selectedData" :options="dataFiles"></b-form-select>
            </b-form-group>
          </b-col>
          <b-col cols="4" v-if="selectedData">
            <b-form-group
              :description="'Selected: ' + (selectedModel ? selectedModel : 'ALL')"
              label="Model"
              label-for="modelFilter"
            >
              <b-form-select v-model="selectedModel" :options="availableModels"></b-form-select>
            </b-form-group>
          </b-col>
        </b-row>
        <b-card no-body>
          <b-tabs pills card>
            <b-tab title="Tensorflow JS" active>
              <TensorflowJS
                :forecast-months="2"
                :selected-data-file="selectedData"
                :selected-model="selectedModel"
              ></TensorflowJS>
            </b-tab>
            <b-tab title="Kalman Test">
              <KalmanJSTest :selected-data-file="selectedData" :selected-model="selectedModel"></KalmanJSTest>
            </b-tab>
            <!-- <b-tab title="Time Series Analysis Test">
              <TimeSeriesTest :selected-data-file="selectedData" :selected-model="selectedModel"></TimeSeriesTest>
            </b-tab> -->
          </b-tabs>
        </b-card>
      </div>
    </div>
  </div>
</template>

<script>
import KalmanJSTest from './components/KalmanJS';
import TimeSeriesTest from './components/TimeSeries';
import TensorflowJS from './components/TensorflowJS';
import DataMixin from './mixins/DataMixin';

export default {
	name: 'PageIndex',
	components: {
		KalmanJSTest,
		TimeSeriesTest,
		TensorflowJS
	},
	mixins: [DataMixin],
	data() {
		return {};
	}
};
</script>

<style>
#app {
	font-family: 'Avenir', Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 60px;
}
</style>
