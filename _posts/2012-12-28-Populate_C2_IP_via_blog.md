---
title: "블로그 게시물을 통한 숙주서버 IP수신... "
author: Francesco

layout: single
categories:
  - malware-analysis

author_profile: true
tags:
  - Malware
---
대부분의 숙주서버(C&C) 호스트 또는 IP 정보는 악성코드 내에 하드코딩되어 있거나, 내부 연산을 통해 동적으로 생성되는 경우가 일반적입니다.  최근에 접한 악성코드 9902.exe(52F6218A2AA9DE9096727D365D53297A)는 특정 블로그 게시물 내용에 숙주서버 IP 를 전달받아서 접속하는 방식을 사용하고 있습니다.
악성코드는 ASPROTECT 2.x 버전으로 패킹되어 있었음..

> ![parse](/images/blog_c2_1.jpeg)
> ![parse](/images/blog_c2_2.jpeg)

blog.sina.???.cn/s/blog_a37c841a01012teh.html 게시물에 숙주서버 IP 정보가 명시되어 있음...  요렇게... Conten-Loioncat:1[199.114.243.69:9902]

> ![parse](/images/blog_c2_3.jpeg)
숙주서버에 접속하면, 좀비PC 의 시스템정보(OS,CPU,메모리 등등) 함...

