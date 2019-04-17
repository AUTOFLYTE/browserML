<template>
  <div>
    <template v-if="selectedDataFile">
      <b-row>
        <b-col cols="3">
          <b-input-group size="sm" prepend="Iterations">
            <b-form-input v-model="model.epochs" type="number"></b-form-input>
          </b-input-group>
        </b-col>
        <b-col cols="4">
          <b-input-group size="sm" prepend="Hidden Layers">
            <b-form-input v-model="model.hiddenLayers" :min="1" type="number"></b-form-input>
          </b-input-group>
        </b-col>
        <b-col cols="4">
          <b-input-group size="sm" prepend="Learn Rate">
            <b-form-input v-model="model.learnRate" type="number"></b-form-input>
          </b-input-group>
        </b-col>
        <b-col cols="3">
          <b-input-group size="sm" prepend="Batch Size">
            <b-form-input
              v-model="model.batchSize"
              :min="1"
              :max="formattedData.length"
              type="number"
            ></b-form-input>
          </b-input-group>
        </b-col>
        <b-col cols="3">
          <b-input-group size="sm" prepend="Window">
            <b-form-input v-model="model.window" :min="1" type="number" :disabled="true"></b-form-input>
          </b-input-group>
        </b-col>
        <b-col>
          <b-button
            class="float-right"
            :disabled="trainProgress.working"
            @click="trainModel"
          >Train Model</b-button>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <highcharts style="width:100%;" :options="extendedChartOptions"/>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <b-progress-bar
            v-if="trainProgress.working"
            :value="trainProgress.progress"
            :max="trainProgress.steps"
            show-progress
            animated
          >
            <template
              v-if="trainProgress.steps > 0"
            >Training Data: {{trainProgress.progress}} / {{trainProgress.steps}}</template>
            <template v-if="trainProgress.steps === 0">Waiting...</template>
          </b-progress-bar>
        </b-col>
        <b-col>
          <span class="float-right" v-if="trainProgress.loss">Loss: {{trainProgress.loss}}</span>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <h4>Data</h4>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <b-table hover small :items="tableData"/>
        </b-col>
      </b-row>
    </template>
  </div>
</template>
<script>
import Highcharts from 'highcharts';
import * as tf from '@tensorflow/tfjs';
import _ from 'lodash';
import { ISO_MONTH_KEY } from '../mixins/DataMixin';

import PredictionChartMixin from '../mixins/PredictionChartMixin';

// This is outside of vue, we don't want it watched!!!
let trainedModel;

export default {
	mixins: [PredictionChartMixin],
	watch: {
		selectedModel() {
			this.unreadyModel();
		},
		model: {
			handler() {
				this.unreadyModel();
			},
			deep: true
		}
	},
	data() {
		return {
			modelReady: false,
			trainProgress: {
				steps: 0,
				progress: 0,
				working: false,
				loss: undefined
			},
			model: {
				epochs: 200,
				learnRate: 0.01,
				hiddenLayers: 1,
				batchSize: 10,
				window: 12
			}
		};
	},
	mounted() {},
	computed: {
		testSeries() {
			if (!this.modelReady) {
				return {};
			} else {
				let windowArray = [];
				let dataArray = [];
				let formattedData = this.formattedData;
				for (let i = 0; i < formattedData.length - 1; i++) {
					let currentData = formattedData[i];
					windowArray.push(currentData.unitsSold);
					if (windowArray.length === this.model.window) {
						let nextDate = formattedData[i + 1].timestamp;
						let predictionResultTensor = this.denormalizeTensor(
							trainedModel.predict(
								this.normalizeTensor(
									tf.tensor2d(windowArray, [1, windowArray.length])
								)
							)
						);
						let prediction = Math.round(
							Array.from(predictionResultTensor.dataSync())[0]
						);
						dataArray.push([nextDate, prediction]);
						// Pop the top :)
						windowArray.shift();
					}
				}

				return {
					type: 'line',
					name: 'Test Fit Data',
					visible: true,
					color: Highcharts.getOptions().colors[3],
					data: dataArray
				};
			}
		},
		predictionSeries() {
			if (!this.modelReady) {
				return {};
			} else {
				let nMonths = this.forecastMonths;
				let lastKnownMonthData = this.formattedData[
					this.formattedData.length - 1
				];
				let data = [];
				let lastSales = [];
				for (
					let i = this.formattedData.length - this.model.window;
					i < this.formattedData.length;
					i++
				) {
					let sales = this.formattedData[i];
					lastSales.push(sales.unitsSold);
				}
				for (let i = 0; i <= nMonths; i++) {
					let newDate = new Date(lastKnownMonthData.salesMonth);
					newDate.setMonth(newDate.getMonth() + i);
					let inputTensor = tf.tensor2d(lastSales, [1, lastSales.length]);
					let predictionResult = this.denormalizeTensor(
						trainedModel.predict(this.normalizeTensor(inputTensor))
					);
					// Check with AF, do we want to floor to err on the side caution
					let prediction = Math.round(
						Array.from(predictionResult.dataSync())[0]
					);
					lastSales.shift();
					lastSales.push(prediction);
					data.push([newDate.getTime(), prediction]);
				}
				return {
					type: 'line',
					name: 'Forecast Sales',
					color: Highcharts.getOptions().colors[4],
					data: data
				};
			}
		},
		chartSeries() {
			// TODO plot the predicted future sales
			// TODO on a seperate series plot the prediction for the known sales
			if (!this.modelReady) {
				return this.defaultChartSeries;
			} else {
				return this.defaultChartSeries.concat([
					this.testSeries,
					this.predictionSeries
				]);
			}
		},
		extendedChartOptions() {
			return _.merge(this.chartOptions, {
				xAxis: {
					plotBands: [
						{
							color: '#9EEBEA66', // Color value
							from: 0, // Start of the plot band
							to: this.formattedData[this.model.window].timestamp // End of the plot band
						}
					]
				}
			});
		},
		filteredData() {
			return _.chain(this.selectedDataFile)
				.filter((s) => {
					if (!this.selectedModel) {
						return true;
					} else {
						return this.selectedModel === s.Model;
					}
				})
				.groupBy(ISO_MONTH_KEY)
				.map((val, key) => {
					let retVal = {
						UnitsSold: _.sumBy(val, 'UnitsSold')
					};
					retVal[ISO_MONTH_KEY] = key;
					return retVal;
				})
				.sortBy(ISO_MONTH_KEY)
				.value();
		},
		formattedData() {
			return this.filteredData.map((s) => {
				return new SalesDataModel(s.UnitsSold, s[ISO_MONTH_KEY]);
			});
		},
		formattedDataKeys() {
			if (this.formattedData.length) {
				return Object.keys(this.formattedData[0]);
			} else {
				return [];
			}
		},
		chartTitle() {
			let title = 'Neural Network Pediction';
			return title;
		},
		fullSalesTensor() {
			return this.formattedData.map((d) => d.inputTensor);
		},
		inputTensor() {
			// Fill this, once full, clone it and push it
			let windowArray = [];
			let tensorArray = [];
			// Push the data from chosen window to the input tensor
			for (let i = 0; i < this.formattedData.length - 1; i++) {
				let currentData = this.formattedData[i];
				console.log('data', currentData);
				windowArray.push(currentData.unitsSold);
				if (windowArray.length === this.model.window) {
					console.log('shift');
					tensorArray.push(_.clone(windowArray));
					windowArray.shift();
				}
			}
			console.log('inputTensor', tensorArray);
			return this.normalizeTensor(tf.tensor2d(tensorArray));
		},
		outputTensor() {
			console.log(
				'outputTensor',
				this.fullSalesTensor.slice(this.model.window)
			);
			// Slice the remaining unwindowed data points and put into output tensor
			return this.normalizeTensor(
				tf.tensor2d(this.fullSalesTensor.slice(this.model.window))
			);
		},
		tableData() {
			let idx = 0;
			return this.formattedData.map((d) => {
				return {
					index: idx++,
					month: d.salesMonth.toLocaleDateString(),
					unitsSold: d.unitsSold
				};
			});
		},
		// To be used in scaling (How though?)
		unitsSoldValues() {
			return this.formattedData.map((d) => d.unitsSold);
		},
		unitsSoldMin() {
			return Math.min.apply(null, this.unitsSoldValues);
		},
		unitsSoldMax() {
			return Math.max.apply(null, this.unitsSoldValues);
		}
	},
	methods: {
		// (val - min) / (max - min) = xNorm
		normalizeTensor(tensor) {
			tensor = tensor
				.sub(this.unitsSoldMin)
				.div(tf.scalar(this.unitsSoldMax - this.unitsSoldMin));
			return tensor;
		},
		// xNorm(max - min) + min = val
		denormalizeTensor(tensor) {
			tensor = tensor
				.mul(this.unitsSoldMax - this.unitsSoldMin)
				.add(this.unitsSoldMin);
			return tensor;
		},
		unreadyModel() {
			this.modelReady = false;
			trainedModel = undefined;
		},
		trainModel() {
			// Do some UI stuff

			this.trainProgress.progress = 0;
			this.trainProgress.working = true;
			this.unreadyModel();
			// We mark the model undefined here... so better let a tick pass
			this.$nextTick(() => {
				let window = this.model.window;
				let epochs = Number.parseInt(this.model.epochs);
				this.trainProgress.steps = epochs;
				// increase number of input neurons
				let inputNeurons = 100;

				let model = tf.sequential();

				let featureCount = window;
				console.log(featureCount);
				model.add(
					tf.layers.dense({
						inputShape: [featureCount],
						units: inputNeurons,
						activation: 'elu'
					})
				);
				// I think we need an RNN here... (https://www.codeproject.com/Articles/1265477/TensorFlow-js-Predicting-Time-Series-Using-Recurre)
				let rnnInputLayerFeatures = 10;
				let rnnInputLayerTimesteps = Math.floor(
					inputNeurons / rnnInputLayerFeatures
				);
				let rnnInputShape = [rnnInputLayerFeatures, rnnInputLayerTimesteps];
				let rnnOutputNeurons = 30;

				let lstmCells = [];
				// param
				let hiddenLayers = this.model.hiddenLayers;
				for (let i = 0; i < hiddenLayers; i++) {
					lstmCells.push(tf.layers.lstmCell({ units: rnnOutputNeurons }));
				}
				model.add(tf.layers.reshape({ targetShape: rnnInputShape }));
				model.add(
					tf.layers.rnn({
						cell: lstmCells,
						inputShape: rnnInputShape,
						returnSequences: false
					})
				);

				model.add(
					tf.layers.dense({
						inputShape: [rnnOutputNeurons],
						units: 1,
						activation: 'elu'
					})
				);
				model.compile({
					optimizer: tf.train.adam(this.model.learnRate),
					loss: 'meanSquaredError'
				});
				model.summary();
				// model.fitDataset(this.flattenedTensorDataset.batch(5), {
				// 	epochs: 45,
				// 	callbacks: {
				// 		onEpochEnd: (e, logs) => {
				// 			console.log(e + ':' + logs.loss);
				// 		}
				// 	}
				// });
				model
					.fit(this.inputTensor, this.outputTensor, {
						epochs: epochs,
						batchSize: Number.parseInt(this.model.batchSize),
						callbacks: {
							onEpochEnd: (e, logs) => {
								this.trainProgress.progress++;
								this.trainProgress.loss = logs.loss;
								// console.log(e + ':' + logs.loss);
							}
						}
					})
					.then((res) => {
						trainedModel = model;
						this.modelReady = true;
					})
					.finally(() => {
						this.trainProgress.working = false;
					});
			});
		}
	}
};

class SalesDataModel {
	unitsSold;
	// This is a js date object
	salesMonth;

	constructor(unitsSold, isoDateString) {
		this.unitsSold = unitsSold;
		this.salesMonth = new Date(isoDateString);
	}

	get year() {
		return this.salesMonth.getFullYear();
	}

	get month() {
		return this.salesMonth.getMonth();
	}

	get timestamp() {
		return this.salesMonth.getTime();
	}

	get inputTensor() {
		return [this.unitsSold];
	}

	get outputTensor() {
		return [this.unitsSold];
	}
}
</script>ipt>