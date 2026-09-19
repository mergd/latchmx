import type {
  NearbyDoorsEvents,
  NearbyPeripheral,
} from './LatchNearbyDoors.types';

export default {
  async scanAsync(
    _durationMilliseconds: number,
    _includeUnnamed: boolean,
  ): Promise<NearbyPeripheral[]> {
    return [];
  },
  async startContinuousAsync(_includeUnnamed: boolean): Promise<void> {},
  async stopAsync(): Promise<void> {},
  addListener<EventName extends keyof NearbyDoorsEvents>(
    _eventName: EventName,
    _listener: NearbyDoorsEvents[EventName],
  ) {
    return { remove() {} };
  },
};
