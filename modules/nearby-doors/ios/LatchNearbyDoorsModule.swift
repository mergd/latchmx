import CoreBluetooth
import ExpoModulesCore

private struct Observation {
  let id: String
  var name: String
  var readings: [Int]

  var medianRSSI: Int {
    let sorted = readings.sorted()
    return sorted[sorted.count / 2]
  }

  var record: [String: Any] {
    [
      "id": id,
      "name": name,
      "rssi": medianRSSI,
      "samples": readings.count
    ]
  }
}

private final class NearbyScanner: NSObject, CBCentralManagerDelegate {
  private var central: CBCentralManager?
  private var scanPromise: Promise?
  private var pendingDuration: TimeInterval?
  private var observations: [UUID: Observation] = [:]
  private var scanGeneration = 0

  func scan(durationMilliseconds: Double, promise: Promise) {
    guard scanPromise == nil else {
      promise.reject("ERR_NEARBY_SCAN_ACTIVE", "A nearby-door scan is already active.")
      return
    }
    pendingDuration = min(max(durationMilliseconds / 1000, 0.75), 5)
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
    guard let name = advertisedName ?? peripheral.name, !name.isEmpty else { return }
    let identifier = peripheral.identifier
    if var existing = observations[identifier] {
      existing.name = name
      if existing.readings.count < 25 {
        existing.readings.append(value)
      }
      observations[identifier] = existing
    } else {
      observations[identifier] = Observation(
        id: identifier.uuidString,
        name: name,
        readings: [value]
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
    observations = [:]
    scanPromise?.reject(code, message)
    scanPromise = nil
  }
}

public final class LatchNearbyDoorsModule: Module {
  private let scanner = NearbyScanner()

  public func definition() -> ModuleDefinition {
    Name("LatchNearbyDoors")

    AsyncFunction("scanAsync") { (durationMilliseconds: Double, promise: Promise) in
      DispatchQueue.main.async {
        self.scanner.scan(durationMilliseconds: durationMilliseconds, promise: promise)
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
