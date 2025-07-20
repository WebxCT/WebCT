
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

---

Due to a mixture of experiment delays, CDT-required work placement, scope creep, conference presentations and multiple instances of bereavement, work on thesis writeup has been delayed.
However, outcomes over the past few years include multiple conference awards, open-source software release downloaded by more than 300 users, and the CoSeC 2023 Research Impact Award from UKRI STFC.
- https://www.bangor.ac.uk/news/2023-12-08-advancing-x-ray-simulations-iwan-mitchell-receives-cosec-impact-award
- https://www.cosec.ac.uk/impact/cosec-announces-impact-award-for-2023/

Currently, the submitted workplan accurately represents progress from the original missed deadline. WebCT (https://webct.io) was released as a paper in December, and has gained wide success in usage, including being asked to host a training session for the X-ray reconstruction team at STFC Harwell, near Diamond Light Source. It is currently being investigated for its inclusion in the application process for Diamond Light Source's DIAD beamline.

The Nuclear fuel pellet paper was accepted at a journal, pending a second round of review.

The research within the ongoing Digital Twin paper resulted in the CoSeC Impact award, with the opportunity to present at a UKRI quarterly meeting in London. We are working with international collaborators in INSA-Lyon and CREATIS, with relationships developed from the previous year after being awarded a Taith grant. The paper only requires a few more editing passes, since all experimental procedures are now complete and nearly all the textual content is written. We hope to submit soon.

The content within the automated metrology paper was presented at a conference last year, with collaboration between multiple groups at STFC. We demonstrated the use of my digital twinning work as applied to microsatellites for automated manufactured defect detection. Most of the research content in the paper is complete, however it still needs to be drafted.


On a more personal level, last year was a difficult time mentally, to put it bluntly, as my auntie committed suicide, followed by my grandad gaining rapidly developing brain cancer and dying.

My hope is to finish collating results and publishing my research over the next few months, as we've received very positive feedback on the research outcomes and enthusiasm from different industries.
