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
import timeseries from 'timeseries-analysis';
import Highcharts from 'highcharts';
import PredictionChartMixin from '../mixins/PredictionChartMixin';
import KalmanJS from '/src/components/KalmanJS';
import JsonViewer from 'vue-json-viewer';
import { ISO_MONTH_KEY as isoMonthKey } from '../mixins/DataMixin';
import _ from 'lodash';
import RMSE from '../RMSE';

export default {
	components: {
		JsonViewer,
		KalmanJS
	},
	mixins: [PredictionChartMixin],
	computed: {
		timeseriesResults() {
			let retVal = {
				trainingData: [],
				forecastData: [],
				actualVsPredicted: [],
				// Test the uncertainty with a band here...
				forecastRanges: [],
				uncertainty: 0
			};

			var ts = new timeseries.main(this.salesByMonth);
			// console.log(ts);
			// var bestSettings = ts.regression_forecast_optimize();
			// ts.sliding_regression_forecast({
			//    sample:	bestSettings.sample,
			//    degree: 	bestSettings.degree,
			//    method: 	bestSettings.method
			//  });
			var forecastDatapoint = 25;
			var coeffs = ts.ARMaxEntropy({
				data: ts.data.slice(0, 24)
			});

			var forecast = 0; // Init the value at 0.
			for (var i = 0; i < coeffs.length; i++) {
				// Loop through the coefficients
				forecast -= ts.data[24 - i][1] * coeffs[i];
				// Explanation for that line:
				// t.data contains the current dataset, which is in the format [ [date, value], [date,value], ... ]
				// For each coefficient, we substract from "forecast" the value of the "N - x" datapoint's value, multiplicated by the coefficient, where N is the last known datapoint value, and x is the coefficient's index.
			}
			console.log('forecast for march (TS analysis)', forecast);
		},
		calculatedRmse() {
			let retVal = RMSE.rmse(this.timeseriesResults);
			return retVal;
		},
		chartSeries() {
			var name = this.timeseriesResults;
			// TODO plot the predicted future sales
			// TODO on a seperate series plot the prediction for the known sales
			return this.defaultChartSeries.concat([
				{
					type: 'line',
					name: 'Future Sales',
					data: this.forecast,
					zIndex: 10,
					marker: {
						fillColor: 'white',
						lineWidth: 3,
						lineColor: Highcharts.getOptions().colors[3]
					}
				}
			]);
		}
	},
	methods: {
		printDataToConsole() {
			console.log('salesByMonth', this.salesByMonth);
		}
	}
};
</script>

