Pod::Spec.new do |s|
  s.name           = 'DuplicateDetector'
  s.version        = '1.0.0'
  s.summary        = 'Native duplicate detection via SHA256 hashing'
  s.description    = 'Computes SHA256 hashes of photo assets natively for fast duplicate detection'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

