import * as Location from 'expo-location';
import { Platform } from 'react-native';

import {
  buildLocationTaskOptions,
  getLocationConfig,
} from '../../src/services/locationTrackingConfig';
import { pisahkanTitikTerbaru } from '../../src/services/locationSample';

jest.mock('expo-location');

const MENIT = 60 * 1000;

function setPlatform(os: 'android' | 'ios') {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe('buildLocationTaskOptions', () => {
  const diam = getLocationConfig(0.9, false);

  it('Android: titik dikirim tiap interval walau HP diam (tanpa syarat jarak)', () => {
    setPlatform('android');

    const opsi = buildLocationTaskOptions(diam);

    expect(opsi.distanceInterval).toBe(0);
    expect(opsi.timeInterval).toBe(10 * MENIT);
  });

  it('iOS mempertahankan syarat jarak karena tidak mengenal timeInterval', () => {
    setPlatform('ios');

    expect(buildLocationTaskOptions(diam).distanceInterval).toBe(100);
  });

  it('titik tidak ditahan lebih lama dari intervalnya sendiri', () => {
    const bergerak = getLocationConfig(0.9, true);

    expect(buildLocationTaskOptions(bergerak).deferredUpdatesInterval).toBe(5 * MENIT);
  });

  it('OS tidak boleh menjeda tracking saat HP diam', () => {
    const opsi = buildLocationTaskOptions(diam);

    expect(opsi.pausesUpdatesAutomatically).toBe(false);
    expect(opsi.activityType).toBe(Location.ActivityType.OtherNavigation);
  });
});

describe('pisahkanTitikTerbaru', () => {
  const titik = (timestamp: number) =>
    ({ timestamp, coords: { latitude: timestamp, longitude: 0 } }) as Location.LocationObject;

  it('memilih titik terbaru dari batch yang dikirim OS dari yang tertua', () => {
    const { terbaru, sebelumnya } = pisahkanTitikTerbaru([titik(1), titik(3), titik(2)]);

    expect(terbaru?.timestamp).toBe(3);
    expect(sebelumnya.map((t) => t.timestamp)).toEqual([1, 2]);
  });

  it('batch kosong tidak menghasilkan titik', () => {
    expect(pisahkanTitikTerbaru([]).terbaru).toBeUndefined();
  });
});
