---
title: "Docker Storage Driver에서 Whiteout 검색"
author: Francesco

layout: single
categories:
  - digital-forensics

author_profile: true
tags:
  - Forensics
---
Docker는 Union filesystem 구조를 지원하는 Storage Driver를 사용하며, 파일 및 디렉터리가 삭제되었을 경우, whiteout 처리를 한다. Whiteout처리 방식은 Storage Driver에 따라 다르다. 대표적인 Storage Driver인 AUFS와 Overlay2 드라이버에서 whiteout 처리된 파일 및 디렉터리를 검색하는 소스를 코딩하여, 개인 github 사이트에 공개하였습니다. 이 소스코드는 삭제된 파일/디렉터리 중에서 whiteout처리된 파일/디렉터리만 검색이 가능합니다.

[Docker-Forensic - github](https://github.com/kk0m4k/docker-forensics)
