
- [x] add twin attribute to beam
- [x] twin set in beam request
- [x] convert beam to [tubetwinbeam] or [synchtwinbeam] depending on original beam
- [x] sim use direct flux from beam if twinbeam

- [x] gettwins endpoint
- [x] detector gain
- [x] gain on all projections
- [ ] gain on reconstruction
- [x] detector fov
- [ ] source filtration
  - all but monochromatic
- [ ] validation
  - [x] beam validation
  - [ ] stage validation
- [ ] twin affiliations



<-- list[digitaltwin]

-->
source
	-> labbeam[tubebeam]
	-> medbeam[tubebeam]
	-> synchbeam
detector
capture
scan

if tubetwinbeam:
	twin.apply(tubetwinbeam)

twinbeam

- twinbeamtube
  - kv
  - **photonspercm2**
- twinbeamsynchrotron
  - energy bins
  - photonspercm2

```python
from gvxr.DigitalTwins import Device, LabCT, Synchrotron, getDigitalTwins, create

twins = listDigitalTwins()

twin = create(twins[0])
```

https://sourceforge.net/p/gvirtualxray/gitroot/ci/twinning/tree/


wrappers/

filtration for models


[-negative, -negative, default] or [positive, positive, default] for distances


Device.py:
Device

Labcy.py:
LabCT

Synchrotron.py:
Synchrotron
instantiate

utils.py:
getDigitalTwins()


json5 schema for gvxr and webct
