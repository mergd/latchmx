package expo.modules.latchnearbydoors

import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

private data class Observation(
  var name: String,
  val readings: MutableList<Int>,
  var advertisement: MutableMap<String, Any>
) {
  fun record(id: String): Map<String, Any> {
    val sorted = readings.sorted()
    return advertisement + mapOf(
      "id" to id,
      "name" to name,
      "rssi" to sorted[sorted.size / 2],
      "samples" to readings.size
    )
  }
}

class LatchNearbyDoorsModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var promise: Promise? = null
  private var scanner: android.bluetooth.le.BluetoothLeScanner? = null
  private var includeUnnamed = false
  private val observations = mutableMapOf<String, Observation>()
  private var generation = 0

  private val callback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      observe(result)
    }

    override fun onBatchScanResults(results: MutableList<ScanResult>) {
      results.forEach(::observe)
    }

    override fun onScanFailed(errorCode: Int) {
      reject("ERR_NEARBY_SCAN_FAILED", "Bluetooth scan failed ($errorCode).")
    }
  }

  override fun definition() = ModuleDefinition {
    Name("LatchNearbyDoors")

    AsyncFunction("scanAsync") { durationMilliseconds: Double, includeUnnamed: Boolean, promise: Promise ->
      handler.post { start(durationMilliseconds, includeUnnamed, promise) }
    }

    AsyncFunction("stopAsync") { promise: Promise ->
      handler.post {
        finish()
        promise.resolve(null)
      }
    }

    OnDestroy {
      handler.post { cancel() }
    }
  }

  @SuppressLint("MissingPermission")
  private fun start(durationMilliseconds: Double, includeUnnamed: Boolean, nextPromise: Promise) {
    if (promise != null) {
      nextPromise.reject("ERR_NEARBY_SCAN_ACTIVE", "A nearby-door scan is already active.", null)
      return
    }
    val context = appContext.reactContext
    if (context == null) {
      nextPromise.reject("ERR_BLUETOOTH_UNAVAILABLE", "Bluetooth is unavailable right now.", null)
      return
    }
    if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
      nextPromise.reject("ERR_BLUETOOTH_UNSUPPORTED", "Bluetooth is unavailable on this device.", null)
      return
    }
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter = manager?.adapter
    if (adapter == null) {
      nextPromise.reject("ERR_BLUETOOTH_UNSUPPORTED", "Bluetooth is unavailable on this device.", null)
      return
    }
    if (!adapter.isEnabled) {
      nextPromise.reject("ERR_BLUETOOTH_OFF", "Turn on Bluetooth to find nearby doors.", null)
      return
    }
    val nextScanner = adapter.bluetoothLeScanner
    if (nextScanner == null) {
      nextPromise.reject("ERR_BLUETOOTH_UNAVAILABLE", "Bluetooth is unavailable right now.", null)
      return
    }

    promise = nextPromise
    scanner = nextScanner
    this.includeUnnamed = includeUnnamed
    observations.clear()
    generation += 1
    val activeGeneration = generation
    try {
      nextScanner.startScan(
        null,
        ScanSettings.Builder()
          .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
          .build(),
        callback
      )
      val duration = durationMilliseconds.coerceIn(750.0, 5000.0).toLong()
      handler.postDelayed({
        if (generation == activeGeneration) finish()
      }, duration)
    } catch (_: SecurityException) {
      reject("ERR_BLUETOOTH_UNAUTHORIZED", "Allow Nearby devices access to find nearby doors.")
    }
  }

  @SuppressLint("MissingPermission")
  private fun observe(result: ScanResult) {
    val rssi = result.rssi
    if (rssi >= 0 || rssi < -110) return
    val record = result.scanRecord ?: return
    val advertisedName = record.deviceName.orEmpty()
    if (!includeUnnamed && advertisedName.isEmpty()) return
    val id = result.device.address
    val advertisement = mutableMapOf<String, Any>(
      "advertisedName" to advertisedName,
      "peripheralName" to "",
      "serviceUuids" to (record.serviceUuids?.map { it.uuid.toString().uppercase(Locale.US) }?.sorted() ?: emptyList<String>()),
      "overflowServiceUuids" to emptyList<String>(),
      "solicitedServiceUuids" to emptyList<String>(),
      "serviceData" to (record.serviceData?.entries?.map { (uuid, data) ->
        mapOf(
          "uuid" to uuid.uuid.toString().uppercase(Locale.US),
          "hex" to data.toHex(),
          "bytes" to data.size
        )
      }?.sortedBy { it["uuid"] as String } ?: emptyList<Map<String, Any>>()),
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      advertisement["connectable"] = result.isConnectable
    }
    if (record.txPowerLevel != Int.MIN_VALUE) {
      advertisement["txPower"] = record.txPowerLevel
    }
    if (record.manufacturerSpecificData.size() > 0) {
      val manufacturerId = record.manufacturerSpecificData.keyAt(0)
      val data = record.manufacturerSpecificData.valueAt(0)
      advertisement["manufacturerId"] = manufacturerId
      advertisement["manufacturerDataHex"] = data.toHex()
      advertisement["manufacturerDataBytes"] = data.size
    }

    val existing = observations[id]
    if (existing == null) {
      observations[id] = Observation(advertisedName, mutableListOf(rssi), advertisement)
    } else {
      if (advertisedName.isNotEmpty()) existing.name = advertisedName
      existing.advertisement.putAll(advertisement.filterValues {
        when (it) {
          is String -> it.isNotEmpty()
          is Collection<*> -> it.isNotEmpty()
          else -> true
        }
      })
      if (existing.readings.size < 25) existing.readings.add(rssi)
    }
  }

  @SuppressLint("MissingPermission")
  private fun finish() {
    val activePromise = promise ?: return
    try {
      scanner?.stopScan(callback)
    } catch (_: SecurityException) {
      // Permission can be revoked while a scan is active; return what was observed.
    }
    generation += 1
    scanner = null
    promise = null
    includeUnnamed = false
    val records = observations.entries
      .map { (id, observation) -> observation.record(id) }
      .sortedByDescending { it["rssi"] as Int }
    observations.clear()
    activePromise.resolve(records)
  }

  @SuppressLint("MissingPermission")
  private fun reject(code: String, message: String) {
    try {
      scanner?.stopScan(callback)
    } catch (_: SecurityException) {
      // Nothing else to clean up.
    }
    generation += 1
    scanner = null
    observations.clear()
    val activePromise = promise
    promise = null
    includeUnnamed = false
    activePromise?.reject(code, message, null)
  }

  private fun cancel() {
    val activePromise = promise
    promise = null
    reject("ERR_NEARBY_SCAN_CANCELLED", "Nearby-door scanning stopped.")
    activePromise?.reject("ERR_NEARBY_SCAN_CANCELLED", "Nearby-door scanning stopped.", null)
  }
}

private fun ByteArray.toHex(): String = joinToString("") { "%02X".format(it) }
