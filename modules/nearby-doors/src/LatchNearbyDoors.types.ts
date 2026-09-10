export type NearbyPeripheral = {
  id: string;
  name: string;
  advertisedName: string;
  peripheralName: string;
  rssi: number;
  samples: number;
  connectable?: boolean;
  txPower?: number;
  manufacturerId?: number;
  manufacturerDataHex?: string;
  manufacturerDataBytes?: number;
  serviceUuids: string[];
  overflowServiceUuids: string[];
  solicitedServiceUuids: string[];
  serviceData: {
    uuid: string;
    hex: string;
    bytes: number;
  }[];
};
