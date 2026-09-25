import ExpoModulesCore
import CoreMotion
import simd

public final class DontMoveAttitudeModule: Module {
  private let manager = CMMotionManager()
  private var referenceFrame: CMAttitudeReferenceFrame {
    CMMotionManager.availableAttitudeReferenceFrames().contains(.xArbitraryCorrectedZVertical)
      ? .xArbitraryCorrectedZVertical : .xArbitraryZVertical
  }

  public func definition() -> ModuleDefinition {
    Name("DontMoveAttitude")
    Constant("isSimulator") {
      #if targetEnvironment(simulator)
      return true
      #else
      return false
      #endif
    }
    Constant("available") { self.manager.isDeviceMotionAvailable }
    Constant("referenceFrame") {
      self.referenceFrame == .xArbitraryCorrectedZVertical ? "arbitrary-corrected" : "arbitrary"
    }
    Events("onAttitude", "onFailure")
    AsyncFunction("start") {
      guard self.manager.isDeviceMotionAvailable else {
        throw NSError(domain: "DontMoveAttitude", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Device motion unavailable"])
      }
      self.manager.stopDeviceMotionUpdates()
      self.manager.deviceMotionUpdateInterval = 1.0 / 60.0
      // OS fusion with accumulated yaw-error correction when supported. This is
      // not a magnetic-north frame, app gyro integration, or adaptive game neutral.
      self.manager.startDeviceMotionUpdates(using: self.referenceFrame, to: .main) { [weak self] motion, error in
        guard let self else { return }
        if let error {
          self.sendEvent("onFailure", ["message": error.localizedDescription])
          return
        }
        guard let motion else { return }
        let r = motion.attitude.rotationMatrix
        // Core Motion's DCM maps reference -> device. Transpose it to expose
        // a canonical active device -> reference quaternion to the game.
        let deviceToReference = simd_double3x3(columns: (
          SIMD3(r.m11, r.m12, r.m13), SIMD3(r.m21, r.m22, r.m23), SIMD3(r.m31, r.m32, r.m33)))
        let q = simd_quatd(deviceToReference).normalized
        let v = motion.rotationRate
        let a = motion.userAcceleration
        self.sendEvent("onAttitude", [
          "q": ["x": q.imag.x, "y": q.imag.y, "z": q.imag.z, "w": q.real],
          "timestamp": motion.timestamp,
          // Preserve sample age across the native/JS bridge, not just arrival time.
          "receivedAt": (Date().timeIntervalSince1970 - (ProcessInfo.processInfo.systemUptime - motion.timestamp)) * 1000,
          "rotationRate": sqrt(v.x*v.x + v.y*v.y + v.z*v.z),
          "acceleration": sqrt(a.x*a.x + a.y*a.y + a.z*a.z)
        ])
      }
    }.runOnQueue(.main)
    AsyncFunction("stop") { self.manager.stopDeviceMotionUpdates() }.runOnQueue(.main)
    OnDestroy { self.manager.stopDeviceMotionUpdates() }
  }
}
