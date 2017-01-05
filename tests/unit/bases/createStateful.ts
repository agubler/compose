import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createStateful from '../../../src/bases/createStateful';

registerSuite({
	name: 'mixins/createStateful',
	creation: {
		'no options'() {
			const stateful = createStateful();
			assert.deepEqual(stateful.state, {}, 'stateful should have empty state');
		}
	}
});
