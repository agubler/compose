import { deepAssign } from 'dojo-core/lang';
import {
	Evented,
	EventedOptions
} from 'dojo-interfaces/bases';
import WeakMap from 'dojo-shim/WeakMap';
import createEvented from './createEvented';
import { ComposeFactory } from '../compose';

export interface State {
	[index: string]: any;
}

export interface Stateful<S extends State> extends Evented {
	/**
	 * A state of the instannce
	 */
	readonly state: S;

	/**
	 * Set the state on the instance.
	 *
	 * Set state can take a partial value, therefore if a key is ommitted from the value, it will not be changed.
	 * To *clear* a value, set a key to `undefined`
	 *
	 * @param value The state (potentially partial) to be set
	 */
	setState(state: Partial<S>): void;
}

/**
 * Options for a stateful object
 */
export interface StatefulOptions<S> extends EventedOptions {}

/**
 * Stateful Factory
 */
export interface StatefulFactory extends ComposeFactory<Stateful<State>, StatefulOptions<State>> {}

/**
 * Private map of internal instance state.
 */
const instanceStateMap = new WeakMap<Stateful<State>, State>();

/**
 * Create an instance of a stateful object
 */
const createStateful: StatefulFactory = createEvented
	.mixin({
		className: 'Stateful',
		mixin: {
			get state(this: Stateful<State>) {
				return instanceStateMap.get(this);
			},
			setState<S extends State>(this: Stateful<S>, value: Partial<S>) {
				const oldState = instanceStateMap.get(this);
				const state = deepAssign({}, oldState, value);
				const type = 'state:changed';
				const eventObject = {
					type,
					state,
					target: this
				};
				instanceStateMap.set(this, state);
				this.emit(eventObject);
			}
		},
		initialize(instance: Stateful<State>) {
			instanceStateMap.set(instance, Object.create(null));
		}
	});

export default createStateful;
