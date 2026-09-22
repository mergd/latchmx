Pod::Spec.new do |s|
  s.name           = 'LatchAppUpdates'
  s.version        = '1.0.0'
  s.summary        = 'Store update availability for LatchMX'
  s.description    = 'Distinguishes production App Store installs from TestFlight.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
