import ExpoModulesCore
import StoreKit

public class LatchAppUpdatesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LatchAppUpdates")

    AsyncFunction("getStoreEnvironmentAsync") { () async -> String in
      do {
        switch try await AppTransaction.shared {
        case .verified(let transaction):
          return transaction.environment == .production ? "production" : "nonproduction"
        case .unverified:
          return "unknown"
        }
      } catch {
        return "unknown"
      }
    }
  }
}
