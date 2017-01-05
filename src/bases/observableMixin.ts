import { Handle } from 'dojo-interfaces/core';
import { StoreObservablePatchable } from 'dojo-interfaces/abilities';
import WeakMap from 'dojo-shim/WeakMap';
import { assign } from 'dojo-core/lang';
import Promise from 'dojo-shim/Promise';
import { Stateful } from './createStateful';
import createEvented from './createEvented';
import { ComposeFactory } from '../compose';
import { State } from './createStateful';

/**
 * Temporary until PR in interfaces.
 */
export type StoreObservablePatchableGetable<S> = StoreObservablePatchable<S> & {
	get(id: string): Promise<S>;
}

/**
 * Properties required for the observable mixin
 */
export interface ObservableProperties {
	id: string;
	stateFrom: StoreObservablePatchableGetable<State>;
}

/**
 * Observable Options
 */
export interface ObservableOptions {
	properties: ObservableProperties;
}

/**
 * Observable Mixin
 */
export interface ObservableMixin extends Stateful<State> {
	/**
	 * Observe the state using the id and stateFrom in the instances properties
	 */
	observe(): void;
}

/**
 * Observable object
 */
export interface Observable extends ObservableMixin {
	properties: ObservableProperties;
}

/**
 * Compose Observable Factory interface
 */
export interface ObservableFactory extends ComposeFactory<ObservableMixin, ObservableOptions> {}

/**
 * interface for the observable state
 */
interface ObservedState {
	id: string;
	state: State;
	handle: Handle;
}

/**
 * Private map for obervable state.
 */
const observedStateMap = new WeakMap<Observable, ObservedState>();

function replaceState(instance: Observable, state: State) {
	const observedState = observedStateMap.get(instance);
	const type = 'state:changed';
	observedState.state = state;
	const eventObject = {
		type,
		state,
		target: instance
	};
	instance.emit(eventObject);
}

/**
 * Observable mixin object
 */
const observableMixin: ObservableFactory = createEvented.mixin({
	className: 'ObservableMixin',
	mixin: {
		get state(this: Observable) {
			return observedStateMap.get(this).state;
		},
		observe(this: Observable): void {
			const observedState = observedStateMap.get(this);
			const { properties: { id, stateFrom } } = this;
			if (!id || !stateFrom) {
				throw new Error('both id and stateFrom are required to observe state');
			}

			if (observedState) {
				if (observedState.id === id) {
					return;
				}
				throw new Error('Unable to observe state for a different id');
			}

			const subscription = stateFrom
			.observe(id)
			.subscribe(
				(state) => {
					replaceState(this, state);
				},
				(err) => {
					throw err;
				}
			);

			stateFrom.get(id).then((state) => {
				replaceState(this, state);
			});

			const handle = {
				destroy: () => {
					subscription.unsubscribe();
					observedStateMap.delete(this);
				}
			};
			observedStateMap.set(this, { id, handle, state: Object.create(null) });
			this.own(handle);
		},
		setState(this: Observable, newState: Partial<State>) {
			const observedState = observedStateMap.get(this);
			this.properties.stateFrom.patch(assign( { id: observedState.id }, newState))
			.then(() => this.properties.stateFrom.get(this.properties.id))
			.then((state: State) => {
				replaceState(this, state);
			});
		},
		diffProperties(this: Observable, previousProperties: any) {
			const observedState = observedStateMap.get(this);
			const { properties: { id, stateFrom } } = this;

			if (observedState) {
				if (stateFrom !== previousProperties.stateFrom || id !== previousProperties.id) {
					observedState.handle && observedState.handle.destroy();
				}
			}

			return Object.keys(this.properties);
		},
		applyChangedProperties(this: Observable) {
			this.observe();
		}
	}
});

export default observableMixin;
