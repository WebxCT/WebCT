
- [x] add twin attribute to beam
- [x] twin set in beam request
- convert beam to [tubetwinbeam] or [synchtwinbeam] depending on original beam
- sim use direct flux from beam if twinbeam

- gettwins endpoint


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
  - photonspercm2
- twinbeamsynchrotron
  - energy bins
  - photonspercm2
