---
title: "사고분석 관점에서 $MFT,$USNJRNL,$LOGFILE 활용"
author: Francesco

layout: single
categories:
  - digital-forensics

author_profile: true
tags:
  - Forensics
---
NTFS 파일 시스템 기반의 윈도우 시스템 사고분석 과정에서 NTFS파일 시스템과 관련된 메타데이터를 수집하여 분석하는 경우가 일반적이다.

대표적인 파일로 MFT, USNJRNL, Logfile이 이에 해당된다. 막상 메타데이터를 확보 하더라도 어떤 관점에서 바라봐야 하는지 막연할 때가 있고, 자칫 중요한 아티팩트를 확보하는데 놓치는 경우가 있다.

사고분석 관점에서 의미 있는 아티팩트 항목을 정리하고자 틈틈히 내용을 정리하고 있다

- 파일 시간 조작 확인
- 특정 시간에 생성 및 삭제된 파일 정보
- 파일 이름 및 사이즈 정보
- $DATA영역에 존재하는 데이터

> <embed src="/files/mft_urnjrnl_logfile_20170720_keynote.pdf" type="application/pdf">
