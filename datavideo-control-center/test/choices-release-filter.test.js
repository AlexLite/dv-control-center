const assert = require('assert')
const { initModelBootstrap } = require('../lib/bootstrap/model-bootstrap')

function hasReleaseLabel(control) {
  return (control?.values || []).some((x) => /\[release\]/i.test(String(x.label || '')))
}

function run() {
  const boot2200 = initModelBootstrap({ requestedModelId: 'se2200' })
  const audioSource = boot2200.catalog.byLabel.get('AUDIO_SOURCE')
  assert(audioSource && Array.isArray(audioSource.values), 'se2200 AUDIO_SOURCE should expose enum values')
  assert(!hasReleaseLabel(audioSource), 'se2200 AUDIO_SOURCE should not include [Release] labels')

  const fixed = (audioSource.values || []).find((x) => String(x.label) === 'Fixed')
  const follow = (audioSource.values || []).find((x) => String(x.label) === 'Follow')
  assert(fixed, 'se2200 AUDIO_SOURCE should include Fixed label')
  assert(follow, 'se2200 AUDIO_SOURCE should include Follow label')
}

run()
console.log('choices-release-filter test passed')
