<template>
  <div>
    <template v-if="selectedDataFile">
      <b-row>
        <b-col>
          <highcharts style="width:100%;" :options="chartOptions"/>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <b-button v-b-toggle.my-collapse>
            <span class="when-opened">Close</span>
            <span class="when-closed">Open</span> Dev Stuff
          </b-button>
          <b-collapse id="my-collapse">
            <b-row>
              <b-col>
                <h4 class="float-left">Data</h4>
              </b-col>
              <b-col>
                <div>
                  <b-button
                    color="primary"
                    label="Primary"
                    class="float-right"
                    @click="printDataToConsole"
                  >Print Data to Console</b-button>
                </div>
              </b-col>
            </b-row>
            <b-row>
              <b-col cols="4">
                <h6>Demo Data Keys</h6>
                <ol>
                  <li v-for="key in dataKeys" :key="key">{{key}}</li>
                </ol>
              </b-col>
              <b-col cols="4">
                <h6>Sales by Month</h6>
                <json-viewer :value="salesByMonth" boxed/>
              </b-col>
              <b-col cols="4">
                <h6>Chart Options</h6>
                <json-viewer :value="chartOptions" boxed/>
              </b-col>
            </b-row>
          </b-collapse>
        </b-col>
      </b-row>
    </template>
  </div>
</template>

<script>
import KalmanFilter from 'kalmanjs';
// import randn from 'randn'
import Highcharts from 'highcharts';
import _ from 'lodash';
import JsonViewer from 'vue-json-viewer';
import RMSE from '../RMSE';
import { ISO_MONTH_KEY as isoMonthKey } from '../mixins/DataMixin';
import PredictionChartMixin from '../mixins/PredictionChartMixin';
import TimeSeries from '/src/components/TimeSeries';

export default {
	name: 'KalmanJS',
	components: {
		JsonViewer,
		TimeSeries
	},
	mixins: [PredictionChartMixin],
	computed: {
		kalmanFilterResults() {
			let retVal = {
				trainingData: [],
				forecastData: [],
				actualVsPredicted: [],
				// Test the uncertainty with a band here...
				forecastRanges: [],
				uncertainty: 0
			};
			//console.log(this.selectedModel, this.salesByMonth);
			//console.log(this.futureSalesSeries);
			// TODO the math here is *magic*, is there any way to deduce seasonality without the coded 12/13 here
			if (
				this.selectedModel != null &&
				this.salesByMonth[13][1] > this.salesByMonth[12][1]
			) {
				console.log('here', this.salesByMonth[13]);
				var i = 1.2;
			} else if (
				this.selectedModel != null &&
				this.salesByMonth[13][1] < this.salesByMonth[12][1]
			) {
				console.log('here smaller');
				var i = 0.8;
			}
			if (
				this.selectedModel == null &&
				this.salesByMonth[13][1] > this.salesByMonth[12][1]
			) {
				var i = 1.2;
			} else if (
				this.selectedModel == null &&
				this.salesByMonth[13][1] < this.salesByMonth[12][1]
			) {
				var i = 0.8;
			}
			var kalmanFilter = new KalmanFilter({ R: 8, A: i });
			// make predictions
			retVal.trainingData = this.salesByMonth.map(function(v) {
				let actual = v[1];
				let predicted = kalmanFilter.filter(v[1]);
				retVal.actualVsPredicted.push({
					actual: actual,
					predicted: predicted
				});
				return [v[0], predicted];
			});
			retVal.uncertainty = kalmanFilter.uncertainty();
			// Apply the filter to the future months
			this.futureMonths.forEach((m) => {
				let predictedValue = kalmanFilter.predict(1);
				retVal.forecastData.push([
					m.getTime(),
					kalmanFilter.filter(predictedValue, 1)
				]);
				retVal.forecastRanges.push([
					m.getTime(),
					predictedValue - retVal.uncertainty,
					predictedValue + retVal.uncertainty
				]);
			});
			return retVal;
		},
		kalmanTrainingSeries() {
			return this.kalmanFilterResults.trainingData;
		},
		futureSalesSeries() {
			// Highcharts expects data for timeseries to be in a double array
			// 	var dataExponential = Array.apply(null, { length: 20 }).map(function(
			// 	e,
			// 	i
			// ) {
			// 	return Math.pow(1.1, i);
			// });
			// var noisyDataExponential = dataExponential.map(function(v) {
			// 	return v + Math.random(-50) - Math.random(100);
			// });
			// Set algorithm adjustments
			let lastTrainingPoint = this.kalmanTrainingSeries[
				this.kalmanTrainingSeries.length - 1
			];
			return [lastTrainingPoint].concat(this.kalmanFilterResults.forecastData);
		},
		calculatedRmse() {
			let retVal = RMSE.rmse(this.kalmanFilterResults.actualVsPredicted);
			return retVal;
		},
		futureSalesUncertaintySeries() {
			let uncertainty = this.calculatedRmse;
			return _.map(this.futureSalesSeries, (s) => {
				return [
					s[0],
					Math.floor(s[1] - uncertainty),
					Math.ceil(s[1] + uncertainty)
				];
			});
		},
		kalmanUncertainty() {
			return this.kalmanFilterResults.uncertainty;
		},

		chartSeries() {
			// TODO plot the predicted future sales
			// TODO on a seperate series plot the prediction for the known sales
			return this.defaultChartSeries.concat([
				{
					type: 'line',
					name: 'Future Sales',
					data: this.futureSalesSeries,
					zIndex: 10,
					marker: {
						fillColor: 'white',
						lineWidth: 3,
						lineColor: Highcharts.getOptions().colors[3]
					}
				},
				{
					type: 'arearange',
					linkedTo: ':previous',
					name:
						'Future Sales Confidence (+-' +
						this.calculatedRmse.toFixed(1) +
						')',
					data: this.futureSalesUncertaintySeries,
					color: Highcharts.getOptions().colors[3],
					zIndex: 0,
					marker: {
						enabled: false
					}
				},
				{
					type: 'line',
					name: 'Training',
					visible: false,
					data: this.kalmanTrainingSeries
				}
			]);
		}
	},
	methods: {
		printDataToConsole() {
			console.log('salesByMonth', this.salesByMonth);
		},
		kalmanForecast() {
			console.log('salesByMonth', this.salesByMonth);
			// Actual data generation
		}
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
.collapsed > .when-opened,
:not(.collapsed) > .when-closed {
	display: none;
}
</style>

