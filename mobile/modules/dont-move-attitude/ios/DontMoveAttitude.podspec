Pod::Spec.new do |s|
  s.name = 'DontMoveAttitude'
  s.version = '1.0.0'
  s.summary = 'Core Motion attitude for fixed-neutral tilt controls'
  s.description = s.summary
  s.license = 'MIT'
  s.author = 'Dont Move'
  s.homepage = 'https://expo.dev'
  s.source = { :git => 'https://github.com/expo/expo.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreMotion'
  s.source_files = '**/*.swift'
end
