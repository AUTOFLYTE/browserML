/* global require */
import _ from 'lodash';
let dealerA = require('../data/dealerA.json');

export const ISO_MONTH_KEY = 'Month (ISO-8601)';

export default {
	data() {
		return {
			selectedModel: null,
			selectedData: dealerA,
			dataFiles: [
				{
					text: 'Dealer A (114)',
					value: dealerA
				},
				{
					text: 'Dealer B (285)',
					value: require('../data/dealerB.json')
				},
				{
					text: 'Dealer C (161)',
					value: require('../data/dealerC.json')
				},
				{
					text: 'Dealer D (38)',
					value: require('../data/dealerD.json')
				}
			]
		};
	},
	computed: {
		availableModels() {
			let models = _.chain(this.selectedData)
				// TODO if possible.. filter out the no sales, breaks the Kalman filter currently
				//	.filter((d) => d.UnitsSold > 0)
				.map((d) => d.Model)
				.uniq()
				.sortBy()
				.value();
			return [{ value: null, text: 'ALL' }].concat(
				models.map((m) => {
					return {
						value: m,
						text: m
					};
				})
			);
		},
		monthsInData() {
			return (
				_.chain(this.selectedData)
					.map((d) => d[ISO_MONTH_KEY])
					.uniq()
					.map((m) => new Date(m))
					// Sort the dates ASC
					.sortBy()
					.value()
			);
		}
	}
};
