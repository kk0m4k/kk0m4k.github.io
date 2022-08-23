---
title: "Vmware 가상머신 우회 악성코드"
author: Francesco

layout: single
categories:
  - malware-analysis

author_profile: true
tags:
  - Malware
---
'12년 5월, DDoS 공격을 유발한 좀비PC에서 수집한 악성코드(32EBE2CEF738DA27B03A36E9BCB29196)는 vmware 가상머신 환경이면 실행을 종료하는 코드가 내장되어 있습니다.  알려진 vmware 가상머신 탐지 기법은 많이 있지만, 이번 악성코드는  VMwareHostOpen.exe 레지스트리 키 값을 체크하는 방식입니다.

> Applications\\VMwareHostOpen.exe
> ![parse](/images/vmware_bypass_1.jpeg)

Applications\\VMwareHostOpen.exe는 base64로 인코딩되어 있으며, 인코딩된 문자열은QXBwbGljYXRpb25zXFxWTXdhcmVIb3N0T3Blbi5 임.
> ![parse](/images/vmware_bypass_2.jpeg)

VMwarehostopen.exe 레지스트리 체크하는 Function를 호출한 후, 그 결과 값(Vmware 환경 유무)에 대해서 바로 체크하지 않고 다른 기능을 수행한 후에 vmware 환경이면 악성코드가 종료되는 구조 임.

> ![parse](/images/vmware_bypass_3.jpeg)
