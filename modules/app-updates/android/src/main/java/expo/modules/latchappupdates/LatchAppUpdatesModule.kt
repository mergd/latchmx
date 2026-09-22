package expo.modules.latchappupdates

import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LatchAppUpdatesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LatchAppUpdates")

    AsyncFunction("getPlayUpdateAsync") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.resolve(null)
        return@AsyncFunction
      }

      AppUpdateManagerFactory.create(context).appUpdateInfo
        .addOnSuccessListener { info ->
          if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE) {
            promise.resolve(info.availableVersionCode())
          } else {
            promise.resolve(null)
          }
        }
        .addOnFailureListener { promise.resolve(null) }
    }
  }
}
