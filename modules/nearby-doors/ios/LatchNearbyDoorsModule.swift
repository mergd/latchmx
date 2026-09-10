import CoreBluetooth
import ExpoModulesCore
import Foundation

private struct Observation {
  let id: String
  var name: String
  var readings: [Int]
  var advertisement: [String: Any]

  var medianRSSI: Int {
    let sorted = readings.sorted()
    return sorted[sorted.count / 2]
  }

  var record: [String: Any] {
    var value = advertisement
    value.merge([
      "id": id,
      "name": name,
      "rssi": medianRSSI,
      "samples": readings.count
    ]) { _, latest in latest }
    return value
  }
}

private final class NearbyScanner: NSObject, CBCentralManagerDelegate {
  private var central: CBCentralManager?
  private var scanPromise: Promise?
  private var pendingDuration: TimeInterval?
  private var includeUnnamed = false
  private var observations: [UUID: Observation] = [:]
  private var scanGeneration = 0

  func scan(durationMilliseconds: Double, includeUnnamed: Bool, promise: Promise) {
    guard scanPromise == nil else {
      promise.reject("ERR_NEARBY_SCAN_ACTIVE", "A nearby-door scan is already active.")
      return
    }
    pendingDuration = min(max(durationMilliseconds / 1000, 0.75), 5)
    self.includeUnnamed = includeUnnamed
    scanPromise = promise
    observations = [:]
    if central == nil {
      central = CBCentralManager(delegate: self, queue: .main)
    } else {
      startIfReady()
    }
  }

  func stop() {
    finishScan()
  }

  func cancel() {
    central?.stopScan()
    scanGeneration += 1
    scanPromise?.reject("ERR_NEARBY_SCAN_CANCELLED", "Nearby-door scanning stopped.")
    scanPromise = nil
    pendingDuration = nil
    includeUnnamed = false
    observations = [:]
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    startIfReady()
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    let value = RSSI.intValue
    guard value < 0, value >= -110 else { return }
    let advertisedName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
    let peripheralName = peripheral.name
    let name = advertisedName ?? peripheralName ?? ""
    guard includeUnnamed || !name.isEmpty else { return }
    let advertisement = diagnosticAdvertisement(
      advertisementData,
      advertisedName: advertisedName,
      peripheralName: peripheralName
    )
    let identifier = peripheral.identifier
    if var existing = observations[identifier] {
      if !name.isEmpty {
        existing.name = name
      }
      existing.advertisement = mergeAdvertisement(existing.advertisement, advertisement)
      if existing.readings.count < 25 {
        existing.readings.append(value)
      }
      observations[identifier] = existing
    } else {
      observations[identifier] = Observation(
        id: identifier.uuidString,
        name: name,
        readings: [value],
        advertisement: advertisement
      )
    }
  }

  private func startIfReady() {
    guard let central, let duration = pendingDuration, scanPromise != nil else { return }
    switch central.state {
    case .poweredOn:
      pendingDuration = nil
      scanGeneration += 1
      let generation = scanGeneration
      central.scanForPeripherals(
        withServices: nil,
        options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
      )
      DispatchQueue.main.asyncAfter(deadline: .now() + duration) { [weak self] in
        guard self?.scanGeneration == generation else { return }
        self?.finishScan()
      }
    case .poweredOff:
      rejectScan(code: "ERR_BLUETOOTH_OFF", message: "Turn on Bluetooth to find nearby doors.")
    case .unauthorized:
      rejectScan(code: "ERR_BLUETOOTH_UNAUTHORIZED", message: "Allow Bluetooth access to find nearby doors.")
    case .unsupported:
      rejectScan(code: "ERR_BLUETOOTH_UNSUPPORTED", message: "Bluetooth is unavailable on this device.")
    case .unknown, .resetting:
      break
    @unknown default:
      rejectScan(code: "ERR_BLUETOOTH_UNAVAILABLE", message: "Bluetooth is unavailable right now.")
    }
  }

  private func finishScan() {
    central?.stopScan()
    scanGeneration += 1
    pendingDuration = nil
    includeUnnamed = false
    guard let promise = scanPromise else { return }
    scanPromise = nil
    let records = observations.values
      .sorted { $0.medianRSSI > $1.medianRSSI }
      .map(\.record)
    observations = [:]
    promise.resolve(records)
  }

  private func rejectScan(code: String, message: String) {
    central?.stopScan()
    scanGeneration += 1
    pendingDuration = nil
    includeUnnamed = false
    observations = [:]
    scanPromise?.reject(code, message)
    scanPromise = nil
  }
}

public final class LatchNearbyDoorsModule: Module {
  private let scanner = NearbyScanner()

  public func definition() -> ModuleDefinition {
    Name("LatchNearbyDoors")

    AsyncFunction("scanAsync") { (durationMilliseconds: Double, includeUnnamed: Bool, promise: Promise) in
      DispatchQueue.main.async {
        self.scanner.scan(
          durationMilliseconds: durationMilliseconds,
          includeUnnamed: includeUnnamed,
          promise: promise
        )
      }
    }

    AsyncFunction("stopAsync") { (promise: Promise) in
      DispatchQueue.main.async {
        self.scanner.stop()
        promise.resolve(nil)
      }
    }

    OnDestroy {
      DispatchQueue.main.async {
        self.scanner.cancel()
      }
    }
  }
}

private func diagnosticAdvertisement(
  _ advertisementData: [String: Any],
  advertisedName: String?,
  peripheralName: String?
) -> [String: Any] {
  let serviceUUIDs = uuidStrings(advertisementData[CBAdvertisementDataServiceUUIDsKey])
  let overflowServiceUUIDs = uuidStrings(
    advertisementData[CBAdvertisementDataOverflowServiceUUIDsKey]
  )
  let solicitedServiceUUIDs = uuidStrings(
    advertisementData[CBAdvertisementDataSolicitedServiceUUIDsKey]
  )
  let serviceData = (advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data] ?? [:])
    .map { uuid, data in
      [
        "uuid": uuid.uuidString.uppercased(),
        "hex": hexString(data),
        "bytes": data.count
      ] as [String: Any]
    }
    .sorted { ($0["uuid"] as? String ?? "") < ($1["uuid"] as? String ?? "") }
  let manufacturerData = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data

  var result: [String: Any] = [
    "advertisedName": advertisedName ?? "",
    "peripheralName": peripheralName ?? "",
    "serviceUuids": serviceUUIDs,
    "overflowServiceUuids": overflowServiceUUIDs,
    "solicitedServiceUuids": solicitedServiceUUIDs,
    "serviceData": serviceData
  ]
  if let manufacturerData {
    result["manufacturerDataHex"] = hexString(manufacturerData)
    result["manufacturerDataBytes"] = manufacturerData.count
    if manufacturerData.count >= 2 {
      let start = manufacturerData.startIndex
      result["manufacturerId"] =
        Int(manufacturerData[start]) | (Int(manufacturerData[manufacturerData.index(after: start)]) << 8)
    }
  }
  if let connectable = advertisementData[CBAdvertisementDataIsConnectable] as? NSNumber {
    result["connectable"] = connectable.boolValue
  }
  if let txPower = advertisementData[CBAdvertisementDataTxPowerLevelKey] as? NSNumber {
    result["txPower"] = txPower.intValue
  }
  return result
}

private func mergeAdvertisement(
  _ existing: [String: Any],
  _ latest: [String: Any]
) -> [String: Any] {
  var result = existing
  for (key, value) in latest {
    if let string = value as? String, string.isEmpty {
      continue
    }
    if let array = value as? [Any], array.isEmpty {
      continue
    }
    result[key] = value
  }
  return result
}

private func uuidStrings(_ value: Any?) -> [String] {
  (value as? [CBUUID] ?? [])
    .map { $0.uuidString.uppercased() }
    .sorted()
}

private func hexString(_ data: Data) -> String {
  data.map { String(format: "%02X", $0) }.joined()
}
