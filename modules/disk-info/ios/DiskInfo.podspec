Pod::Spec.new do |s|
  s.name           = 'DiskInfo'
  s.version        = '1.0.0'
  s.summary        = 'Native disk space info'
  s.description    = 'Returns total and available disk space from the native filesystem API'
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
